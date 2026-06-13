import React, { useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import Loader from '../../components/Loader';
import * as adminService from '../../services/admin.service';

function AdminRevenue() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revenueData, setRevenueData] = useState({
        summary: { today: 0, week: 0, month: 0, year: 0 },
        weeklyTrend: {},
        monthlyTrend: {},
        hotelBreakdown: []
    });

    useEffect(() => {
        const loadRevenue = async () => {
            try {
                const data = await adminService.revenue();
                setRevenueData(data);
            } catch (err) {
                setError(err?.message || 'Unable to fetch admin revenue');
            } finally {
                setLoading(false);
            }
        };
        loadRevenue();
    }, []);

    if (loading) {
        return <Loader />;
    }

    const formatCurrency = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

    return (
        <div className="m-4">
            <div className="heading-container mb-4">
                <h4 className="text-center text-white pt-4 m-0">Admin Revenue</h4>
            </div>
            {error ? (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            ) : (
                <>
                    <Row className="g-3 mb-4">
                        {Object.entries(revenueData.summary).map(([key, value]) => (
                            <Col key={key} xs={12} sm={6} lg={3}>
                                <Card className="shadow w-100" style={{ minHeight: '10rem', border: 'none' }}>
                                    <Card.Body className="text-white d-flex flex-column" style={{ background: 'linear-gradient(135deg, #08182d, #38EF7D)' }}>
                                        <h6 className="text-center fw-bold m-0">{key.toUpperCase()}</h6>
                                        <div className="d-flex justify-content-center align-items-center my-auto">
                                            <p className="m-0 text-center fw-bold" style={{ fontSize: '28px' }}>
                                                {formatCurrency(value)}
                                            </p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                    <div className="table-responsive bg-white p-3 rounded shadow">
                        <h5>Hotel Breakdown</h5>
                        <table className="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Hotel Name</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revenueData.hotelBreakdown.length ? (
                                    revenueData.hotelBreakdown.map((hotel) => (
                                        <tr key={hotel.hotelId}>
                                            <td>{hotel.hotelName}</td>
                                            <td>{formatCurrency(hotel.revenue)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="text-center py-4">
                                            No hotel revenue data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminRevenue;
