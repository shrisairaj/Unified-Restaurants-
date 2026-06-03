import React, { useEffect } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { FaRupeeSign } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import BarChart from '../../components/BarChart';
import LineChart from '../../components/LineChart';
import Loader from '../../components/Loader';
import NoData from '../../components/NoData';
import { getRevenueRequest } from '../../store/slice/revenue.slice';

function Revenue() {
    const dispatch = useDispatch();
    const { loading, error, summary, weeklyTrend, monthlyTrend, hotelBreakdown } = useSelector(
        (state) => state.revenue
    );

    useEffect(() => {
        dispatch(getRevenueRequest());
    }, [dispatch]);

    const cardDetails = {
        today: { title: 'Today\'s Revenue', background: 'linear-gradient(135deg, #08182d, #38EF7D)' },
        week: { title: 'This Week Revenue', background: 'linear-gradient(135deg, #08182d, #1BFFFF)' },
        month: { title: 'This Month Revenue', background: 'linear-gradient(135deg, #08182d, #614385)' },
        year: { title: 'This Year Revenue', background: 'linear-gradient(135deg, #08182d, #FFC371)' }
    };

    const hotelChartData = hotelBreakdown.map((item) => ({
        hotel: item.hotelName,
        value: item.revenue
    }));

    const formatCurrency = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

    const CardView = ({ title, background, value }) => (
        <Card className="shadow w-100" style={{ height: '10rem', background, border: 'none' }}>
            <Card.Body className="text-white d-flex flex-column">
                <h6 className="text-center fw-bold m-0">{title}</h6>
                <div className="d-flex justify-content-around align-items-center my-auto">
                    <FaRupeeSign size={40} />
                    <p className="m-0 text-center fw-bold" style={{ fontSize: '28px' }}>
                        {formatCurrency(value)}
                    </p>
                </div>
            </Card.Body>
        </Card>
    );

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="m-4">
            <div className="heading-container mb-4">
                <h4 className="text-center text-white pt-4 m-0">Revenue Analytics</h4>
            </div>

            {error ? (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            ) : (
                <>
                    <Row className="g-3 mb-4">
                        {Object.keys(cardDetails).map((key) => (
                            <Col key={key} xs={12} sm={6} lg={3}>
                                <CardView
                                    title={cardDetails[key].title}
                                    background={cardDetails[key].background}
                                    value={summary[key]}
                                />
                            </Col>
                        ))}
                    </Row>

                    <Row className="m-0 mb-4">
                        <Col className="col-sm-7 col-12 mb-4">
                            <h6>Weekly Revenue Trend</h6>
                            {weeklyTrend[0]?.data?.length ? (
                                <LineChart data={weeklyTrend} xLabel="Day" yLabel="Revenue" />
                            ) : (
                                <NoData />
                            )}
                        </Col>
                        <Col className="col-sm-5 col-12 mb-4">
                            <h6>Yearly Revenue by Month</h6>
                            {monthlyTrend.length ? (
                                <BarChart
                                    keys={['value']}
                                    index={'month'}
                                    data={monthlyTrend}
                                    xlabel={'month'}
                                    ylabel={'Revenue'}
                                />
                            ) : (
                                <NoData />
                            )}
                        </Col>
                    </Row>

                    <Row className="m-0">
                        <Col className="col-12">
                            <h6>Hotel-wise Revenue (All Time)</h6>
                            {hotelChartData.length ? (
                                <BarChart
                                    keys={['value']}
                                    index={'hotel'}
                                    data={hotelChartData}
                                    xlabel={'hotel'}
                                    ylabel={'Revenue'}
                                />
                            ) : (
                                <NoData />
                            )}
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
}

export default Revenue;
