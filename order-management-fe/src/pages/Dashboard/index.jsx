import React, { useEffect } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { BiSolidDish, BiSolidFoodMenu } from 'react-icons/bi';
import { FaRupeeSign } from 'react-icons/fa';
import { FaUserTie } from 'react-icons/fa6';
import { MdTableBar } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';
import BarChart from '../../components/BarChart';
import LineChart from '../../components/LineChart';
import NoData from '../../components/NoData';
import { getDashboardRequest } from '../../store/slice';

function Dashboard() {
    const dispatch = useDispatch();
    const hotelId = useSelector((state) => state.hotel.globalHotelId);
    const user = useSelector((state) => state.user?.data);

    console.log('CURRENT PATH', window.location.pathname);
    console.log('SUB STATUS', user?.subscriptionStatus);
    console.log('SUB END', user?.subscriptionEndAt);
    const {
        cardsData,
        dailyRevenue,
        monthRevenue,
        top5,
        details: hotel,
        ...revenueDetails
    } = useSelector((state) => state.dashboard);

    useEffect(() => {
        if (hotelId) {
            dispatch(getDashboardRequest(hotelId));
        }
    }, [hotelId]);

    const cardDetails = {
        orders: {
            background: 'linear-gradient(135deg, #08182d, #1BFFFF)',
            icon: BiSolidDish
        },
        managers: {
            background: 'linear-gradient(135deg, #08182d, #FFC371)',
            icon: FaUserTie
        },
        tables: {
            background: 'linear-gradient(135deg, #08182d, #614385)',
            icon: MdTableBar
        },
        sale: {
            background: 'linear-gradient(135deg, #08182d, #38EF7D)',
            icon: FaRupeeSign
        },
        menu: {
            background: 'linear-gradient(135deg, #08182d, #C33764)',
            icon: BiSolidFoodMenu
        },
        today: {
            background: 'linear-gradient(135deg, #08182d, #08182d)',
            icon: FaRupeeSign
        },
        week: {
            background: 'linear-gradient(135deg, #08182d, #08182d)',
            icon: FaRupeeSign
        },
        year: {
            background: 'linear-gradient(135deg, #08182d, #08182d)',
            icon: FaRupeeSign
        }
    };

    const DashboardNoData = () => (
        <div className="d-flex">
            <NoData className="dashboard-no-data w-50 mx-auto" />
        </div>
    );

    const CardView = ({ item, background, classname, value, icon: Icon }) => {
        return (
            <Card
                key={`dashboard-card-${item}`}
                className={`shadow w-100 ${classname}`}
                style={{
                    height: '10rem',
                    background,
                    border: 'none'
                }}
            >
                <Card.Body className="text-white d-flex flex-column">
                    <h3 className="text-capitalize text-center fw-bold">{item}</h3>
                    <div className="d-flex justify-content-around align-items-center my-auto">
                        <Icon size={50} />
                        <p className="m-0 text-center fw-bold" style={{ fontSize: '35px' }}>
                            {value}
                        </p>
                    </div>
                </Card.Body>
            </Card>
        );
    };

    return (
        <div className="m-4">
            <div className="d-flex flex-sm-row flex-column my-4">
                {Object.keys(cardsData).map((item) => {
                    const Icon = cardDetails[item].icon;
                    return (
                        <CardView
                            background={cardDetails[item].background}
                            classname={'mx-sm-3 my-2'}
                            icon={Icon}
                            item={item}
                            value={cardsData[item]}
                            key={`dashboard-card-${item}`}
                        />
                    );
                })}
            </div>
            <Card className="mx-auto user-details my-5 p-sm-4 shadow custom-shadow">
                <Card.Body>
                    {Object.keys(hotel).length ? (
                        <>
                            {[
                                { label: 'Hotel ID', value: hotel?.id },
                                { label: 'Hotel Name', value: hotel?.name },
                                { label: 'Open Time', value: hotel?.openTime },
                                { label: 'Close Time', value: hotel?.closeTime },
                                { label: 'Address', value: hotel?.address },
                                { label: 'Care Number', value: hotel?.careNumber }
                            ].map(({ label, value }, index) => (
                                <Row className="mb-3" key={`${label}-${index}`}>
                                    <Col className="col-sm-4 col-12">
                                        <strong className="setting-title">{label} : </strong>
                                    </Col>
                                    <Col className="col-sm-8 col-12">
                                        <strong>{value}</strong>
                                    </Col>
                                </Row>
                            ))}
                        </>
                    ) : (
                        <DashboardNoData />
                    )}
                </Card.Body>
            </Card>
            <Row className="m-0">
                <Col className="col-sm-5 col-12">
                    <h6>Top 5 Sold Menu Items</h6>
                    {top5.length ? (
                        <div className="mt-3">
                            {top5.map((item, index) => (
                                <div key={item.id} className="d-flex justify-content-between align-items-center mb-2 p-2" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                                    <div className="d-flex align-items-center">
                                        <span className="fw-bold me-2" style={{ color: '#1BFFFF' }}>{index + 1}.</span>
                                        <span className="fw-semibold">{item.label}</span>
                                    </div>
                                    <div className="text-end">
                                        <div className="fw-bold" style={{ color: '#38EF7D' }}>{item.value} sold</div>
                                        <small className="text-muted">₹{item.revenue?.toLocaleString() || 0}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <DashboardNoData />}
                </Col>
                <Col className="col-sm-7 col-12">
                    {dailyRevenue.data?.length ? (
                        <>
                            <h6>Week Revenue</h6>
                            <LineChart data={dailyRevenue} xLabel="Day" yLabel="Revenue" />
                        </>
                    ) : (
                        <DashboardNoData />
                    )}
                </Col>
            </Row>
            <Row className="d-flex align-items-center m-0">
                <Col className="col-sm-9 col-12">
                    <h6>Month Revenue</h6>
                    {monthRevenue.length ? (
                        <BarChart
                            keys={['value']}
                            index={'month'}
                            data={monthRevenue}
                            xlabel={'month'}
                            ylabel={'Revenue'}
                        />
                    ) : (
                        <DashboardNoData />
                    )}
                </Col>
                <Col className="col-sm-3 col-12">
                    {Object.keys({
                        today: { title: 'Today Revenue', value: revenueDetails.today },
                        week: { title: 'Week Revenue', value: revenueDetails.week },
                        year: { title: 'Year Revenue', value: revenueDetails.year }
                    }).map((item) => (
                        <CardView
                            background={cardDetails[item].background}
                            classname={'me-4 my-3'}
                            icon={cardDetails[item].icon}
                            item={item}
                            value={revenueDetails[item]}
                            key={`dashboard-card-${item}`}
                        />
                    ))}
                </Col>
            </Row>
        </div>
    );
}

export default Dashboard;
