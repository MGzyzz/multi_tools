import './Tools.css';
import { useState, useEffect } from 'react';
import { getStudentsList } from '../../api/getStudentList';
import { getStatusBotTelegram } from '../../api/statusBotTelegram';

const Home = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botStatus, setBotStatus] = useState(null);

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

    const fetchBotStatus = async () => {
      try {
        const status = await getStatusBotTelegram();
        setBotStatus(status);
      } catch (error) {
        setBotStatus({ status: 'offline' });
      }
    };

    fetchStudents();
    fetchBotStatus();
  }, []);

  const schedules = [
    { group: { name: 'Group A' }, subject: 'Math', date: '2025-04-23', time: '10:00' },
    { group: { name: 'Group B' }, subject: 'Physics', date: '2025-04-24', time: '12:00' },
  ];

  const groups = [
    { id: 1, name: 'Group A' },
    { id: 2, name: 'Group B' },
  ];

  if (loading) return <div className="text-center mt-5"><h2 className="text-white">Loading...</h2></div>;
  if (error) return <div className="text-center mt-5"><h2 className="text-danger">Error: {error.message}</h2></div>;

  return (
    <div className="container mt-3">
      {/* Telegram Tools Block */}
      <div className="col-12 mt-5">
        <div className="card shadow-sm bg-dark text-white rounded-5">
          <div className="card-body">
            <h3 className="card-title fw-bold text-center mb-4">Send Message to Telegram</h3>

            {/* Статус бота */}
            {botStatus && (
              <div className="text-center mb-4">
                <div
                  className={`status-indicator d-inline-flex align-items-center justify-content-center rounded-pill px-4 py-2 ${
                    botStatus.status === 'online' ? 'bg-success' : 'bg-danger'
                  }`}
                  style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}
                >
                  <i
                    className={`me-2 bi ${
                      botStatus.status === 'online' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'
                    }`}
                  ></i>
                  Bot is {botStatus.status === 'online' ? 'Online' : 'Offline'}
                </div>
              </div>
            )}

            <form>
              <div className="mb-3">
                <label className="form-label text-secondary">Recipient Group</label>
                <div className="d-flex flex-wrap gap-2">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className="group-card bg-secondary text-white p-2 rounded-3"
                        style={{ cursor: 'pointer' }}
                      >
                        {group.name}
                      </div>
                    ))
                  ) : (
                    <div className="alert alert-danger bg-dark text-danger border-danger">
                      No groups available. Please create a group first.
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="subject" className="form-label text-secondary">Subject</label>
                <input type="text" className="form-control bg-dark text-white border-secondary" id="subject" placeholder="Message subject" />
              </div>

              <div className="mb-3">
                <label htmlFor="message" className="form-label text-secondary">Message</label>
                <textarea className="form-control bg-dark text-white border-secondary" id="message" rows="4" placeholder="Type your message here..."></textarea>
              </div>

              <div className="mb-3 form-check">
                <input type="checkbox" className="form-check-input" id="urgent" />
                <label className="form-check-label text-secondary" htmlFor="urgent">Mark as urgent</label>
              </div>

              <div className="text-center">
                <button type="submit" className="btn btn-secondary px-4 py-2">
                  <i className="bi bi-send-fill me-2"></i>Send Message
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
