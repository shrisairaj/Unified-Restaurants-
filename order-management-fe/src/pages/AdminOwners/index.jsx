import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';
import Loader from '../../components/Loader';
import * as adminService from '../../services/admin.service';

function AdminOwners() {
    const navigate = useNavigate();
    const [owners, setOwners] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadOwners = async () => {
            setLoading(true);
            try {
                const data = await adminService.owners({ search });
                setOwners(data.rows || []);
            } catch (err) {
                setError(err?.message || 'Unable to fetch owners');
            } finally {
                setLoading(false);
            }
        };

        loadOwners();
    }, [search]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="m-4">
            <div className="heading-container mb-4 d-flex justify-content-between align-items-center">
                <h4 className="text-white pt-4 m-0">Owners</h4>
                <div className="d-flex gap-2">
                    <input
                        className="form-control"
                        placeholder="Search owners"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            {error ? (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered table-striped bg-white text-dark">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Hotel Count</th>
                                <th>Hotels</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {owners.length ? (
                                owners.map((owner) => (
                                    <tr key={owner.id}>
                                        <td>{`${owner.firstName} ${owner.lastName}`}</td>
                                        <td>{owner.email}</td>
                                        <td>{owner.phoneNumber}</td>
                                        <td>{owner.hotelCount}</td>
                                        <td>{owner.hotels?.map((hotel) => hotel.name).join(', ') || 'N/A'}</td>
                                        <td>
                                            <CustomButton
                                                className="btn btn-sm btn-primary"
                                                label="View"
                                                onClick={() => navigate(`/admin/owners/${owner.id}`)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">
                                        No owners found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminOwners;
