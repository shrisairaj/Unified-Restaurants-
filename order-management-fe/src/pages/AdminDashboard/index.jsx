import React, { useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import Loader from '../../components/Loader';
import * as adminService from '../../services/admin.service';

function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ ownerCount: 0, managerCount: 0, hotelCount: 0, revenue: 0 });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await adminService.dashboard();
                setStats(data);
            } catch (err) {
                setError(err?.message || 'Unable to fetch admin dashboard');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="m-4">
            <div className="heading-container mb-4">
                <h4 className="text-center text-white pt-4 m-0">Super Admin Dashboard</h4>
            </div>
            {error ? (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            ) : (
                <Row className="g-3">
                    {[
                        { label: 'Owners', value: stats.ownerCount },
                        { label: 'Managers', value: stats.managerCount },
                        { label: 'Hotels', value: stats.hotelCount },
                        { label: 'Total Revenue', value: `₹ ${Number(stats.revenue).toLocaleString()}` }
                    ].map((card) => (
                        <Col key={card.label} xs={12} sm={6} lg={3}>
                            <Card className="shadow w-100" style={{ minHeight: '10rem', border: 'none' }}>
                                <Card.Body className="text-white d-flex flex-column" style={{ background: 'linear-gradient(135deg, #08182d, #38EF7D)' }}>
                                    <h6 className="text-center fw-bold m-0">{card.label}</h6>
                                    <div className="d-flex justify-content-center align-items-center my-auto">
                                        <p className="m-0 text-center fw-bold" style={{ fontSize: '32px' }}>
                                            {card.value}
                                        </p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}

export default AdminDashboard;
