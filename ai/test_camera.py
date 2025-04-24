import cv2
from detection.yolo_detector import YoloDetector

detector = YoloDetector()

cap = cv2.VideoCapture(0)  # захват с камеры

while True:
    ret, frame = cap.read()
    if not ret:
        break

    bboxes = detector.detect_faces(frame)
    for (x1, y1, x2, y2) in bboxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    cv2.imshow('YOLO Face Detection', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
