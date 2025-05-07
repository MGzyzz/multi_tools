import './Home.css';
import { useState, useEffect } from 'react';
import { getStudentsList } from '../../api/getStudentList';
import { getScheduleList } from '../../api/getScheduleList';
import Tools from '../Tools/Tools';

const Home = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [schedules, setSchedules] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentsData = await getStudentsList();
                setStudents(studentsData);
                const schedulesData = await getScheduleList();
                setSchedules(schedulesData);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);


    const groups = [
        { name: "Group A" },
        { name: "Group B" },
    ];

    if (loading) return <div className="text-center mt-5"><h2 className="text-white">Loading...</h2></div>;
    if (error) return <div className="text-center mt-5"><h2 className="text-danger">Error: {error.message}</h2></div>;

    return (
        <div className="container mt-3">
            <div className="row mt-3">
                <div className="col-12 text-center mb-5">
                    <h1 className="display-4 fw-bold text-white">Information Tables</h1>
                    <p className="lead text-secondary">Effortlessly organize your tasks and memories with a modern touch.</p>
                    <button className="btn btn-dark btn-lg">Get Started</button>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12">
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5">
                        <div className="card-body">
                            <div className="text-center mb-4">
                                <h5 className="card-title fw-bold">Текущее расписание</h5>
                                <p className="card-text text-secondary">Store and cherish your memories with a sleek and secure design.</p>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-dark table-striped">
                                    <thead>
                                        <tr>
                                            <th scope="col">#</th>
                                            <th scope="col">Group Name</th>
                                            <th scope="col">Subject</th>
                                            <th scope="col">Date</th>
                                            <th scope="col">Time</th>
                                            <th scope="col">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedules.length > 0 ? (
                                            schedules.map((schedule, index) => (
                                                <tr key={index}>
                                                    <th scope="row">{index + 1}</th>
                                                    <td>{schedule.group.name}</td>
                                                    <td>{schedule.subject.name}</td>
                                                    <td>{schedule.date}</td>
                                                    <td>{schedule.time}</td>
                                                    <td>
                                                        <a href={`/lessons/${schedule.id}`} className="btn btn-info btn-sm text-white">
                                                            View Attendance
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center">No schedule available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5">
                        <div className="card-body text-center">
                            <h5 className="card-title fw-bold">Students</h5>
                            <p className="card-text text-secondary">Получить общие сведения о студентов</p>
                            <div className="d-flex flex-column align-items-start">
                                {students.map((std) => (
                                    <a key={std.id} href={`/student/${std.id}`} className="mb-3 a_block">
                                        {std.first_name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5">
                        <div className="card-body text-center">
                            <h5 className="card-title fw-bold">Группы</h5>
                            <p className="card-text text-secondary">Share tasks and memories with friends and family effortlessly.</p>
                            <div className="d-flex flex-column align-items-start">
                                {groups.map((group, index) => (
                                    <a key={index} href="#" className="mb-3 a_block">{group.name}</a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card shadow-sm h-100 bg-dark text-white rounded-5">
                        <div className="card-body text-center">
                            <h5 className="card-title fw-bold">Отметить студентов</h5>
                            <p className="card-text text-secondary">Быстро отметим студентов без надобности записывать и спрашивать!</p>
                            <a href="#" className="btn btn-info text-white">Перейти -&gt;</a>
                        </div>
                    </div>
                </div>
            </div>

            <Tools></Tools>

        </div>
    );
};

export default Home;