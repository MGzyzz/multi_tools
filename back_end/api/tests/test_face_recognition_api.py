"""Tests for face recognition API endpoints."""

from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from app.models import Student, StudentFaceImage

from .utils import BaseJWTAPITestCase


def _vec(val: float) -> list[float]:
    return [val] + [0.0] * 511


class FaceRecognitionAPITests(BaseJWTAPITestCase):
    """Face recognition API test cases."""

    def setUp(self):
        super().setUp()
        self.student = Student.objects.create(
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            age=20,
        )

    def _upload_file(self):
        return SimpleUploadedFile(
            "face.jpg",
            b"fake-image-bytes",
            content_type="image/jpeg",
        )

    @patch("app.utils.face_embedding.requests.post")
    def test_update_face_embedding_creates_record(self, mock_post):
        """Create StudentFaceImage and save embedding."""
        embedding = _vec(0.1)
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok", "embedding": embedding}
        mock_post.return_value = mock_response

        url = reverse("student_face_embedding", args=[self.student.id])
        response = self.client.post(url, {"file": self._upload_file()}, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "saved")
        self.assertEqual(response.data["student_id"], self.student.id)
        self.assertEqual(StudentFaceImage.objects.count(), 1)
        face = StudentFaceImage.objects.first()
        self.assertEqual(len(face.embedding), 512)

    @patch("app.utils.face_embedding.requests.post")
    def test_update_face_embedding_requires_file(self, mock_post):
        """Return 400 when file is missing."""
        url = reverse("student_face_embedding", args=[self.student.id])
        response = self.client.post(url, {}, **self.auth_headers())
        self.assertEqual(response.status_code, 400)

    @patch("app.utils.face_embedding.requests.post")
    def test_recognize_face_returns_recognized(self, mock_post):
        """Recognize student by closest embedding."""
        student_other = Student.objects.create(
            first_name="Bob",
            last_name="Brown",
            email="bob@example.com",
            age=21,
        )

        emb_target = _vec(1.0)
        emb_other = _vec(-1.0)

        StudentFaceImage.objects.create(
            student=self.student, image=self._upload_file(), embedding=emb_target
        )
        StudentFaceImage.objects.create(
            student=student_other, image=self._upload_file(), embedding=emb_other
        )

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok", "embedding": emb_target}
        mock_post.return_value = mock_response

        url = reverse("student_face_recognize")
        response = self.client.post(url, {"file": self._upload_file()}, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "recognized")
        self.assertEqual(response.data["student_id"], self.student.id)

    @patch("app.utils.face_embedding.requests.post")
    def test_recognize_face_empty_embeddings(self, mock_post):
        """Return empty_embeddings when no face embeddings exist."""
        emb_query = _vec(0.2)
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok", "embedding": emb_query}
        mock_post.return_value = mock_response

        url = reverse("student_face_recognize")
        response = self.client.post(url, {"file": self._upload_file()}, **self.auth_headers())

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["status"], "empty_embeddings")

    @patch("app.utils.face_embedding.requests.post")
    def test_recognize_face_no_face_error(self, mock_post):
        """Return 400 when AI reports no_face."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "no_face", "embedding": None}
        mock_post.return_value = mock_response

        url = reverse("student_face_recognize")
        response = self.client.post(url, {"file": self._upload_file()}, **self.auth_headers())

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "no_face")
