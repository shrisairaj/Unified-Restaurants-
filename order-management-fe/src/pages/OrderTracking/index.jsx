import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MenuBackgroundImg from '../../assets/images/menu-background.png';
import Loader from '../../components/Loader';
import OMTModal from '../../components/Modal';
import { getOrderStatus, getPublicOrderDetails, resetTable, downloadInvoice, cancelOrder } from '../../services/order.service';
import { setOrderDetails, setTrackingOrder } from '../../store/slice';
import '../../assets/styles/menuCard.css';

function OrderTracking() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [order, setOrder] = useState(null);
    const [liveStatus, setLiveStatus] = useState('PENDING');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [cancellingOrder, setCancellingOrder] = useState(false);
    const [cancellationTimeLeft, setCancellationTimeLeft] = useState(300); // 5 minutes in seconds
    const [orderCreatedAt, setOrderCreatedAt] = useState(null);

    useEffect(() => {
        if (!orderId) return;

        const loadOrderDetails = async () => {
            try {
                // Try checking localStorage for initial quick load
                const stored = localStorage.getItem('activeOrder');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.orderId === orderId) {
                        setOrder(parsed);
                        setLiveStatus(parsed.orderStatus || 'PENDING');
                        if (parsed.orderDateTime) {
                            setOrderCreatedAt(new Date(parsed.orderDateTime));
                        }
                        setLoading(false);
                        return;
                    }
                }

                // Fetch details from backend public API
                const data = await getPublicOrderDetails(orderId);
                if (data) {
                    const fetchedOrder = {
                        orderId: data.orderId,
                        orderNumber: data.orderNumber,
                        tableNumber: data.tableNumber,
                        totalPrice: data.totalAmount,
                        hotelId: data.hotelId,
                        hotelName: data.hotelName,
                        customerId: data.customerId,
                        tableId: data.tableId,
                        orderDateTime: data.orderDateTime
                    };
                    setOrder(fetchedOrder);
                    setLiveStatus(data.orderStatus || 'PENDING');
                    setOrderCreatedAt(new Date(data.orderDateTime));
                }
            } catch (err) {
                console.error('Failed to load order details', err);
            } finally {
                setLoading(false);
            }
        };

        loadOrderDetails();
    }, [orderId]);

    useEffect(() => {
        if (!orderId || loading) return;

        const checkStatus = async () => {
            try {
                const res = await getOrderStatus(orderId);
                if (res?.status) {
                    setLiveStatus((prevStatus) => {
                        if (res.status === 'COMPLETED' && prevStatus !== 'COMPLETED') {
                            playBeep();
                            setShowModal(true);
                        }
                        return res.status;
                    });
                }
            } catch (e) {
                console.error('Error fetching order status', e);
            }
        };

        const intervalId = setInterval(checkStatus, 5000);

        return () => {
            clearInterval(intervalId);
        };
    }, [orderId, loading]);

    // Track cancellation window countdown
    useEffect(() => {
        if (!orderCreatedAt) return;

        const countdownTimer = setInterval(() => {
            const now = new Date();
            const secondsElapsed = Math.floor((now - orderCreatedAt) / 1000);
            const timeLeft = Math.max(0, 300 - secondsElapsed); // 5 minutes = 300 seconds
            setCancellationTimeLeft(timeLeft);
        }, 1000);

        return () => clearInterval(countdownTimer);
    }, [orderCreatedAt]);

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order) {
            toast.error('Order details not available');
            return;
        }

        try {
            setDownloadingInvoice(true);
            await downloadInvoice(
                order.hotelId,
                order.orderId,
                order.hotelName || 'hotel',
                order.orderNumber || 'order'
            );
            toast.success('Invoice downloaded successfully');
        } catch (error) {
            console.error('Failed to download invoice', error);
            toast.error('Failed to download invoice');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order || cancellationTimeLeft <= 0) {
            toast.error('Cannot cancel this order');
            return;
        }

        try {
            setCancellingOrder(true);
            await cancelOrder(order.orderId);
            toast.success('Order cancelled successfully');
            setLiveStatus('CANCELLED');
        } catch (error) {
            console.error('Failed to cancel order', error);
            toast.error(error.response?.data?.message || 'Failed to cancel order');
        } finally {
            setCancellingOrder(false);
        }
    };

    const handleCloseOrder = async () => {
        try {
            if (order?.tableId) {
                await resetTable(order.tableId);
            }
        } catch (err) {
            console.error('Failed to reset table', err);
        } finally {
            localStorage.removeItem('activeOrder');
            dispatch(setOrderDetails({}));
            dispatch(setTrackingOrder(null));
            // Return to menu page with tableId
            if (order?.tableId) {
                navigate(`/menu/${order.tableId}`, { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    };

    if (loading) {
        return <Loader />;
    }

    if (!order) {
        return (
            <div className="d-flex h-100 justify-content-center align-items-center bg-dark text-light" style={{ minHeight: '100vh' }}>
                <h3>Order not found</h3>
            </div>
        );
    }

    return (
        <div className="tracking-wrapper animate__animated animate__fadeIn" style={{ backgroundImage: `url(${MenuBackgroundImg})`, minHeight: '100vh', display: 'flex', width: '100vw' }}>
            <div className="tracking-container">
                <div className="tracking-icon-confirmed">Order Confirmed ✅</div>

                <div className={`tracking-status-badge ${liveStatus === 'COMPLETED' ? 'status-ready' : 'status-preparing'}`}>
                    {liveStatus === 'COMPLETED' ? '🟢 Order Ready' : '🟡 Preparing'}
                </div>

                <p className="mb-4 text-light-emphasis" style={{ fontSize: '15px' }}>
                    {liveStatus === 'COMPLETED'
                        ? 'Order Completed. Please collect your order.'
                        : 'Your order has been received and is being prepared.'}
                </p>

                <div className="tracking-detail-row">
                    <span>Order Number:</span>
                    <strong>#{order.orderNumber}</strong>
                </div>

                <div className="tracking-detail-row">
                    <span>Table:</span>
                    <strong>Table {order.tableNumber}</strong>
                </div>

                <div className="tracking-detail-row">
                    <span>Total Amount:</span>
                    <strong>₹{order.totalPrice}</strong>
                </div>

                <div className="tracking-detail-row">
                    <span>Payment Status:</span>
                    <strong className="text-success">Paid</strong>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary tracking-btn"
                        onClick={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                    >
                        {downloadingInvoice ? 'Downloading...' : 'Download Invoice'}
                    </button>

                    {liveStatus !== 'COMPLETED' && liveStatus !== 'CANCELLED' && (
                        <>
                            {cancellationTimeLeft > 0 ? (
                                <button
                                    className="btn btn-warning tracking-btn"
                                    onClick={handleCancelOrder}
                                    disabled={cancellingOrder}
                                >
                                    {cancellingOrder ? 'Cancelling...' : `Cancel Order (${Math.ceil(cancellationTimeLeft / 60)}m)`}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-warning tracking-btn"
                                    disabled={true}
                                    title="Cancellation window expired"
                                >
                                    Cancellation window expired
                                </button>
                            )}
                        </>
                    )}

                    {liveStatus === 'COMPLETED' && (
                        <button className="btn btn-success tracking-btn" onClick={handleCloseOrder}>
                            Close Order
                        </button>
                    )}
                </div>
            </div>

            {showModal && (
                <OMTModal
                    show={showModal}
                    title="Order Ready"
                    description="Order Completed. Please collect your order."
                    handleClose={() => setShowModal(false)}
                    submitText="Collect"
                    handleSubmit={() => setShowModal(false)}
                    isFooter={true}
                    size="md"
                />
            )}
        </div>
    );
}

export default OrderTracking;
