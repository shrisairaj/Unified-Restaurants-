import React, { useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';
import Loader from '../../components/Loader';
import * as adminService from '../../services/admin.service';

function AdminOwnerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [owner, setOwner] = useState(null);

    useEffect(() => {
        const loadOwner = async () => {
            try {
                const data = await adminService.ownerDetail(id);
                setOwner(data);
            } catch (err) {
                setError(err?.message || 'Unable to fetch owner details');
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            loadOwner();
        }
    }, [id]);

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="m-4">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
                <CustomButton label="Go Back" onClick={() => navigate('/admin/owners')} />
            </div>
        );
    }

    return (
        <div className="m-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="text-white pt-4 m-0">Owner Details</h4>
                <CustomButton label="Back to Owners" onClick={() => navigate('/admin/owners')} />
            </div>
            <Row className="g-3">
                <Col xs={12} lg={6}>
                    <Card className="shadow p-4 bg-white text-dark">
                        <h5>Owner Information</h5>
                        <p>
                            <strong>Name:</strong> {owner.firstName} {owner.lastName}
                        </p>
                        <p>
                            <strong>Email:</strong> {owner.email}
                        </p>
                        <p>
                            <strong>Phone:</strong> {owner.phoneNumber}
                        </p>
                        <p>
                            <strong>Status:</strong> {owner.status}
                        </p>
                        <p>
                            <strong>Hotels Managed:</strong> {owner.hotelCount}
                        </p>
                    </Card>
                </Col>
                <Col xs={12} lg={6}>
                    <Card className="shadow p-4 bg-white text-dark">
                        <h5>Hotels</h5>
                        {owner.hotels?.length ? (
                            owner.hotels.map((hotel) => (
                                <div key={hotel.id} className="mb-3">
                                    <strong>{hotel.name}</strong>
                                    <p className="mb-1">{hotel.address}</p>
                                </div>
                            ))
                        ) : (
                            <p>No hotels assigned.</p>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminOwnerDetail;
