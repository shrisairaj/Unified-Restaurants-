import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { FaCircleCheck } from 'react-icons/fa6';
import { IoRocket } from 'react-icons/io5';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import '../../assets/styles/subscription.css';
import CustomButton from '../../components/CustomButton';
import OMTModal from '../../components/Modal';
import Razorpay, { ACTIONS } from '../../components/Razporpay';
import * as subscriptionService from '../../services/subscription.service';
import {
    createSubscriptionOrderRequest,
    verifySubscriptionPaymentRequest,
    setSubscriptionOrder
} from '../../store/slice';

const planOptions = [
    { key: 'MONTHLY', title: 'Monthly', amount: 1000, days: 30 },
    { key: 'SIX_MONTHS', title: '6 Months', amount: 5500, days: 180 },
    { key: 'YEARLY', title: 'Yearly', amount: 11000, days: 365 }
];

const features = [
    'Online menu order',
    'Order management with live notification to manage / cook / waiter',
    'Business statistics on dashboard',
    'Customer Feedback',
    'Online payment integration',
    'E-Invoice for orders'
];

function Subscription() {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [error, setError] = useState('');
    const { subscriptionOrder } = useSelector((state) => state.checkout);
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    console.log('CURRENT PATH', window.location.pathname);
    console.log('SUB STATUS', user?.subscriptionStatus);
    console.log('SUB END', user?.subscriptionEndAt);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await subscriptionService.getStatus();
                setStatusData(response);
            } catch (err) {
                setError(err.message || 'Unable to load subscription status');
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
        return () => {
            dispatch(setSubscriptionOrder(null));
        };
    }, [dispatch, navigate]);

    const handleBuy = (planKey) => {
        setError('');
        setSelectedPlan(planKey);
        setShowModal(true);
    };

    const confirmPurchase = () => {
        if (!selectedPlan) {
            setError('Please select a plan');
            return;
        }
        dispatch(createSubscriptionOrderRequest({ plan: selectedPlan }));
        setShowModal(false);
    };

    const handleSuccess = ({ orderId, paymentId, razorpaySignature }) => {
        dispatch(
            verifySubscriptionPaymentRequest({
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                razorpaySignature,
                plan: selectedPlan,
                navigate
            })
        );
    };

    const renderStatusMessage = () => {
        if (!statusData) return null;
        if (statusData.status === 'ACTIVE') {
            return (
                <div className="alert alert-success text-center">
                    Your subscription is active. {statusData.subscriptionRemaining > 0 && `Remaining ${Math.ceil(statusData.subscriptionRemaining / 86400)} days`}.
                </div>
            );
        }
        if (statusData.status === 'TRIAL') {
            return (
                <div className="alert alert-info text-center">
                    Your free trial is active. {statusData.trialRemaining > 0 && `Expires in ${Math.ceil(statusData.trialRemaining / 60)} minutes`}.
                </div>
            );
        }
        return <div className="alert alert-warning text-center">Your trial/subscription has expired. Please purchase a plan to continue.</div>;
    };

    if (loading) {
        return (
            <div className="position-relative" style={{ height: '30rem' }}>
                <div className="d-flex justify-content-center align-items-center h-100">
                    <Spinner animation="border" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="heading-container">
                <h4 className="text-center text-white pt-5">Subscription</h4>
            </div>
            <div className="text-center text-light my-3">
                {renderStatusMessage()}
                {error && <p className="text-danger">{error}</p>}
            </div>
            <Row className="justify-content-center my-4 m-0">
                {planOptions.map((plan) => (
                    <Col key={plan.key} md={6} lg={4} className="mb-4">
                        <Card className="text-center shadow subscription-card">
                            <Card.Body className="d-flex flex-column">
                                <div className="d-flex justify-content-center align-items-center my-3 text-primary-color">
                                    <IoRocket size={45} />
                                    <h3 className="m-0 mx-4 fw-bold">{plan.title}</h3>
                                </div>
                                <h4 className="fw-bold">₹ {plan.amount}</h4>
                                <p className="text-muted">Valid for {plan.days} days</p>
                                <div className="my-4">
                                    {features.map((feature, index) => (
                                        <Row key={`${plan.key}-${index}`} className="d-flex my-2 m-0">
                                            <Col className="col-1">
                                                <FaCircleCheck size={18} color="#49ac60" />
                                            </Col>
                                            <Col>
                                                <p className="m-0 mx-3">{feature}</p>
                                            </Col>
                                        </Row>
                                    ))}
                                </div>
                                <CustomButton
                                    label={`Buy Now`}
                                    className="mt-auto mx-auto mb-3 col-11 fw-bold"
                                    onClick={() => handleBuy(plan.key)}
                                    disabled={loading}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
            {subscriptionOrder && (
                <Razorpay
                    action={ACTIONS.ORDERS}
                    name={`${user.firstName} ${user.lastName}`}
                    email={user.email}
                    phoneNumber={user.phoneNumber}
                    amount={subscriptionOrder.amount}
                    orderId={subscriptionOrder.orderId}
                    keyId={subscriptionOrder.key}
                    handleSuccess={handleSuccess}
                />
            )}
            <OMTModal
                show={showModal}
                title="Confirm Plan"
                size="md"
                description={
                    <div className="text-center">
                        <h5 className="my-2">Confirm Plan</h5>
                        <p className="my-4">Proceed with the selected plan to activate your account.</p>
                    </div>
                }
                handleSubmit={confirmPurchase}
                handleClose={() => setShowModal(false)}
                submitText="Yes"
                closeText="No"
            />
        </>
    );
}

export default Subscription;
