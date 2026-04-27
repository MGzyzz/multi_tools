import { ApiError, apiRequest } from "@/lib/auth";

type RawRecognizeFaceResponse = {
  status?: string;
  student_id?: number;
  similarity?: number;
  error?: string;
};

export type FaceRecognitionResult =
  | {
      status: "recognized";
      student_id: number;
      similarity: number | null;
    }
  | {
      status: "not_recognized";
      similarity: number | null;
    }
  | {
      status: "no_face";
    }
  | {
      status: "empty_embeddings";
    };

const normalizeSimilarity = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const recognizeStudentFace = async (file: Blob): Promise<FaceRecognitionResult> => {
  const formData = new FormData();
  formData.append("file", file, "scan.jpg");

  try {
    const response = await apiRequest<RawRecognizeFaceResponse>("/api/students/recognize_face/", {
      method: "POST",
      body: formData,
    });

    if (response.status === "recognized" && typeof response.student_id === "number") {
      return {
        status: "recognized",
        student_id: response.student_id,
        similarity: normalizeSimilarity(response.similarity),
      };
    }

    return {
      status: "not_recognized",
      similarity: normalizeSimilarity(response.similarity),
    };
  } catch (error) {
    if (error instanceof ApiError && error.data && typeof error.data === "object") {
      const data = error.data as RawRecognizeFaceResponse;

      if (data.status === "empty_embeddings") {
        return { status: "empty_embeddings" };
      }

      if (data.error === "no_face") {
        return { status: "no_face" };
      }
    }

    throw error;
  }
};
