import cv2

def crop_face(frame, bbox):
    x1, y1, x2, y2 = bbox
    return frame[y1:y2, x1:x2]