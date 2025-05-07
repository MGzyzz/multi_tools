import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Хук для извлечения параметров из URL
import { getAttendanceGroup } from '../../api/getAttendanceGroup';
import { editAttendance } from '../../api/editAttendance'; // Этот импорт может быть использован для обновления посещаемости
import { getScheduleGroupId } from '../../api/getScheduleGroupId';

const Attendance = () => {
    const { scheduleId } = useParams();  // Извлекаем scheduleId из URL

    const [students, setStudents] = useState([]);
    const [group, setGroup] = useState(''); // Название группы
    const [subject, setSubject] = useState(''); // Текущий предмет
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Получаем данные о группе и посещаемости по scheduleId
                const { groupName, subjectName, students: studentsData } = await getAttendanceGroup(scheduleId);
                setGroup(groupName);
                setSubject(subjectName);

                // Сохраняем список студентов
                setStudents(studentsData);

                // Получаем дополнительные данные о группе и предмете
                const scheduleData = await getScheduleGroupId(scheduleId);
                setGroup(scheduleData.name);
                // setSubject(scheduleData.course);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        if (scheduleId) fetchData();
    }, [scheduleId]);

    const toggleAttendance = async (studentId) => {
        try {
            const updatedStudents = students.map((student) =>
                student.id === studentId
                    ? { ...student, presense: !student.presense }
                    : student
            );
            setStudents(updatedStudents);

            // Отправляем обновленный статус на сервер
            await editAttendance(scheduleId, studentId, updatedStudents.find(student => student.id === studentId).presense);
        } catch (err) {
            setError(err);
        }
    };

    if (loading) return <div className="text-center mt-5"><h2 className="text-white">Loading...</h2></div>;
    if (error) return <div className="text-center mt-5"><h2 className="text-danger">Error: {error.message}</h2></div>;

    return (
        <>
            <div className="row mt-3 mb-5">
                <div className="col-12 text-center mb-5">
                    <h1 className="display-4 fw-bold text-white">Mark Attendance</h1>
                    <p className="lead text-secondary">Quickly mark attendance for students with ease.</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 d-flex flex-column flex-lg-row">
                    {/* Left Block: Group and Subject Information */}
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5 me-lg-3 mb-3 mb-lg-0 flex-grow-1">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">Class Information</h5>
                            <p className="card-text text-secondary">Details about the current group and subject.</p>
                            <h3 className="text-white">Group: {group}</h3>
                            <h4 className="text-secondary">Subject: test</h4>
                        </div>
                    </div>

                    {/* Right Block: Attendance Table */}
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
                                                                const markedAt = new Date().toISOString(); // ← Текущая дата/время в ISO формате
                                                                await editAttendance(student.id, updatedStatus, markedAt);
                                                                setStudents(prev =>
                                                                    prev.map(s =>
                                                                        s.id === student.id ? { ...s, presense: updatedStatus } : s
                                                                    )
                                                                );
                                                            } catch (err) {
                                                                setError(err);
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
                                <div className="d-flex justify-content-end">
                                    <a href="#" className='btn btn-info text-white'>Отмететь с помощью ИИ</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Attendance;
