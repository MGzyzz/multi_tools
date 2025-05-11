import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAttendanceGroup } from '../../api/getAttendanceGroup';
import { editAttendance } from '../../api/editAttendance';
import { getScheduleGroupId } from '../../api/getScheduleGroupId';
import { getStatusAI } from '../../api/getStatusAI';
import { check_attendance_use_ai } from '../../api/checkAttendanceUseAI';
import { getResultAttendaceAI } from '../../api/getResultAttendaceAI';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

const Attendance = () => {
    const { scheduleId } = useParams();
    const [modalVisible, setModalVisible] = useState(false);
    const [scanStatus, setScanStatus] = useState('scanning'); // 'scanning', 'success', 'error'
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    const [students, setStudents] = useState([]);
    const [group, setGroup] = useState('');
    const [subject, setSubject] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aiStatus, setAiStatus] = useState('offline'); // Статус ИИ
    const [recognitionInProgress, setRecognitionInProgress] = useState(false); // Флаг процесса распознавания

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { groupName, subjectName, students: studentsData } = await getAttendanceGroup(scheduleId);
                setGroup(groupName);
                setSubject(subjectName);
                setStudents(studentsData);

                const scheduleData = await getScheduleGroupId(scheduleId);
                setGroup(scheduleData.name);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (scheduleId) fetchData();
    }, [scheduleId]);

    useEffect(() => {
        const checkAIStatus = async () => {
            try {
                const statusData = await getStatusAI();
                setAiStatus(statusData.status);
            } catch (err) {
                console.error("Ошибка получения статуса ИИ:", err);
                setAiStatus('offline'); // Устанавливаем дефолтный статус
            }
        };

        checkAIStatus();
    }, []);

    const toggleAttendance = async (studentId) => {
        try {
            const updatedStudents = students.map((student) =>
                student.id === studentId
                    ? { ...student, presense: !student.presense }
                    : student
            );
            setStudents(updatedStudents);

            await editAttendance(
                studentId,  // Первый параметр - ID студента
                !updatedStudents.find(student => student.id === studentId).presense,
                new Date().toISOString()
            );
        } catch (err) {
            setError(err);
        }
    };

    // Проверка результата распознавания с интервалом
    const checkRecognitionResult = async () => {
        try {
            // Получаем результат от ИИ
            const aiResult = await getResultAttendaceAI();
            console.log('AI Result:', aiResult);

            // Если есть user_id, значит лицо распознано
            if (aiResult?.user_id) {
                // Находим студента по ID
                const student = students.find(s => s.student_id === aiResult.user_id);
                
                if (student) {
                    // Отмечаем студента как присутствующего
                    await editAttendance(
                        student.id, // ID студента в таблице attendance
                        true,
                        new Date().toISOString()
                    );

                    // Обновляем локальное состояние
                    setStudents(prev =>
                        prev.map(s =>
                            s.id === student.id ? { ...s, presense: true } : s
                        )
                    );
                    
                    // Меняем статус на успешный
                    setScanStatus('success');
                    
                    // Показываем toast-уведомление об успешной отметке
                    toast.success(`${student.first_name} ${student.last_name} успешно отмечен(а)`, {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });
                    
                    // Закрываем модальное окно ТОЛЬКО после успешного отображения уведомления
                    setTimeout(() => {
                        setModalVisible(false);
                        setRecognitionInProgress(false);
                    }, 1500); // Небольшая задержка для лучшего UX
                    
                    return true; // Распознавание успешно
                } else {
                    // В случае ошибки оставляем модальное окно открытым с кнопкой закрытия
                    setScanStatus('error');
                    toast.error(`Студент с ID ${aiResult.user_id} не найден в списке`);
                    // НЕ закрываем модальное окно автоматически
                    setRecognitionInProgress(false);
                    return true; // Завершаем процесс, хотя с ошибкой
                }
            }
            return false; // Продолжаем ожидание
        } catch (err) {
            console.error("Ошибка при получении результата:", err);
            setScanStatus('error');
            toast.error(err.message || "Ошибка при распознавании");
            setRecognitionInProgress(false);
            return true; // Завершаем процесс с ошибкой
        }
    };

    const handleAIRecognition = async () => {
        if (aiStatus === 'online') {
            try {
                // Сбрасываем состояние модального окна и устанавливаем флаг процесса
                setScanStatus('scanning');
                setModalVisible(true);
                setRecognitionInProgress(true);
                
                // Запускаем распознавание лиц
                await check_attendance_use_ai();
                
                let recognitionCompleted = false;
                
                // Запускаем проверку результата каждую секунду
                const intervalId = setInterval(async () => {
                    const completed = await checkRecognitionResult();
                    if (completed) {
                        clearInterval(intervalId);
                        recognitionCompleted = true; // Отмечаем, что распознавание завершено
                    }
                }, 1000);
                
                // Максимальное время ожидания - 15 секунд (увеличено с 10 до 15 для соответствия бэкенду)
                const timeoutId = setTimeout(() => {
                    clearInterval(intervalId);
                    // Показываем ошибку ТОЛЬКО если распознавание еще не завершено успешно
                    if (!recognitionCompleted) {
                        setScanStatus('error');
                        toast.error("Время ожидания истекло. Лицо не распознано.");
                        setRecognitionInProgress(false);
                        // НЕ закрываем модальное окно автоматически при ошибке
                    }
                }, 15000);
                
            } catch (err) {
                console.error("Ошибка:", err);
                setScanStatus('error');
                toast.error(err.message || "Произошла неизвестная ошибка");
                setRecognitionInProgress(false);
                // НЕ закрываем модальное окно автоматически при ошибке
            }
        }
    };

    // Закрытие модального окна
    const closeModal = () => {
        setModalVisible(false);
        setScanStatus('scanning');
    };

    if (loading) return <div className="text-center mt-5"><h2 className="text-white">Loading...</h2></div>;
    if (error) return <div className="text-center mt-5"><h2 className="text-danger">Error: {error.message}</h2></div>;

    return (
        <>
            {/* Toast-контейнер для уведомлений */}
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
            <div className="row mt-3 mb-5">
                <div className="col-12 text-center mb-5">
                    <h1 className="display-4 fw-bold text-white">Mark Attendance</h1>
                    <p className="lead text-secondary">Quickly mark attendance for students with ease.</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 d-flex flex-column flex-lg-row">
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5 me-lg-3 mb-3 mb-lg-0 flex-grow-1">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">Class Information</h5>
                            <p className="card-text text-secondary">Details about the current group and subject.</p>
                            <h3 className="text-white">Group: {group}</h3>
                            <h4 className="text-secondary">Subject: test</h4>
                        </div>
                    </div>

                    <div className="card shadow-sm col-8 col-sm-12 col-md-12 col-lg-8 h-100 bg-dark text-white rounded-5 flex-grow-2">
                        <div className="card-body">
                            <div className="text-center mb-4">
                                <h5 className="card-title fw-bold">Attendance List</h5>
                                <p className="card-text text-secondary">Mark students as present or absent for the session.</p>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-dark table-striped">
                                    <thead>
                                        <tr>
                                            <th scope="col">#</th>
                                            <th scope="col">Student Name</th>
                                            <th scope="col">Attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((student, index) => (
                                            <tr key={student.id}>
                                                <th scope="row">{index + 1}</th>
                                                <td>{student.first_name} {student.last_name}</td>
                                                <td>
                                                    <button
                                                        className={`btn ${student.presense ? 'btn-success' : 'btn-danger'}`}
                                                        onClick={async () => {
                                                            try {
                                                                const updatedStatus = !student.presense;
                                                                const markedAt = new Date().toISOString();
                                                                await editAttendance(
                                                                    student.id,      // ID студента
                                                                    updatedStatus,  // Статус
                                                                    markedAt        // Время отметки
                                                                );
                                                                setStudents(prev =>
                                                                    prev.map(s =>
                                                                        s.id === student.id ? { ...s, presense: updatedStatus } : s
                                                                    )
                                                                );
                                                                
                                                                // Показываем уведомление при ручном изменении статуса
                                                                const status = updatedStatus ? 'присутствующий' : 'отсутствующий';
                                                                toast.info(`${student.first_name} ${student.last_name} отмечен как ${status}`, {
                                                                    position: "top-right",
                                                                    autoClose: 3000,
                                                                });
                                                            } catch (err) {
                                                                setError(err);
                                                                toast.error(`Ошибка при обновлении: ${err.message}`);
                                                            }
                                                        }}
                                                    >
                                                        {student.presense ? 'Present' : 'Absent'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="d-flex justify-content-between align-items-center">
                                    <a href="#" className='btn btn-secondary'>Create excel file</a>
                                    <div>
                                        <a
                                            href="#"
                                            className={`btn ${aiStatus === 'online' ? 'btn-info' : 'btn-secondary disabled'} text-white`}
                                            onClick={handleAIRecognition}
                                            disabled={recognitionInProgress} // Блокируем кнопку во время распознавания
                                        >
                                            {recognitionInProgress ? 'Распознавание...' : 'Отметить с помощью ИИ'}
                                        </a>

                                        {aiStatus !== 'online' && (
                                            <div className="text-white mt-2 bg-danger w-50 p-2 rounded">AI is offline</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Модальное окно с разными состояниями */}
            {modalVisible && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}
                >
                    <div className="bg-dark text-white p-5 rounded shadow-lg text-center" style={{ minWidth: '350px' }}>
                        {scanStatus === 'scanning' && (
                            <>
                                <h4>Пожалуйста, подождите...</h4>
                                <p>Ваше лицо сканируется системой ИИ</p>
                                <div className="spinner-border text-light mt-3" role="status">
                                    <span className="visually-hidden">Загрузка...</span>
                                </div>
                            </>
                        )}
                        
                        {scanStatus === 'success' && (
                            <>
                                <h4>Успешно!</h4>
                                <p>Ваше лицо распознано, посещение отмечено</p>
                                <div className="text-success fs-1 mt-3">
                                    <i className="bi bi-check-circle-fill"></i>
                                </div>
                            </>
                        )}
                        
                        {scanStatus === 'error' && (
                            <>
                                <h4>Ошибка</h4>
                                <p>Не удалось распознать лицо или отметить посещение</p>
                                <div className="text-danger fs-1 mt-3 mb-3">
                                    <i className="bi bi-x-circle-fill"></i>
                                </div>
                                <button 
                                    className="btn btn-danger mt-2" 
                                    onClick={closeModal}
                                >
                                    Закрыть
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Attendance;