import './Home.css';
import { useState, useEffect } from 'react';
import { getStudentsList } from '../../api/getStudentList';

const Home = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getStudentsList();
        setStudents(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) return <div className="text-center mt-5"><h2 className="text-white">Loading...</h2></div>;
  if (error) return <div className="text-center mt-5"><h2 className="text-danger">Error: {error.message}</h2></div>;

  return (
    <div className="row mt-3">
      {/* Hero Section */}
      <div className="col-12 text-center mb-5">
        <h1 className="display-4 fw-bold text-white">Information Tables</h1>
        <p className="lead text-secondary">Effortlessly organize your tasks and memories with a modern touch.</p>
        <button className="btn btn-dark btn-lg">Get Started</button>
      </div>

      {/* Students Block */}
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
    </div>
  );
};

export default Home;
