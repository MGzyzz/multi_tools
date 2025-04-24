Документация по проекту: AI Face Recognition

Этот модуль системы "Multi Tools" реализует функциональность распознавания лиц с использованием:

YOLOv8 — для детекции лиц на изображении или с видеопотока.

FaceNet — для генерации эмбеддингов лиц и их сравнения с базой.

Проект реализован на Python с использованием OpenCV, TensorFlow и NumPy.

Структура AI-модуля

multi_tools/
└── ai/
    ├── main.py                      # Основной скрипт запуска камеры и распознавания
    ├── generate_embeddings.py       # Генерация эмбеддингов из базы изображений
    ├── data/
    │   └── embeddings.npy           # Словарь эмбеддингов {"user_id": embedding}
    ├── faces_db/                    # Каталог с лицами пользователей по папкам
    ├── detection/
    │   └── yolo_detector.py         # Обертка над моделью YOLOv8
    ├── recognition/
    │   └── facenet_model.py         # Обертка над FaceNet
    └── utils/
        └── compare_faces.py         # Сравнение эмбеддингов по cosine similarity