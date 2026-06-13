import React, { useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import debounce from 'lodash.debounce';
import { Col, Row } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import OMTModal from '../../components/Modal';
import { handleManagerServiceWorkerMessage } from '../../utils/orderNotifications';
import '../../assets/styles/orders.css';
import Table from '../../components/Table';
import * as orderService from '../../services/order.service';
import {
    getCompletedOrdersRequest,
    paymentConfirmationRequest,
    setOrderFiltering,
    setOrderPagination,
    setOrderSorting,
    setPaymentRequest,
    setSelectedOrder,
    getOrderDetailsRequest,
    updateOrderStatusRequest,
    clearOrderDetails
} from '../../store/slice';
import { ORDER_STATUS } from '../../utils/constants';

function Orders() {
    const dispatch = useDispatch();
    const hotelId = useSelector((state) => state.hotel.globalHotelId);
    const {
        completedOrders,
        selectedOrder,
        completedCount,
        sorting,
        filtering,
        pagination,
        paymentRequest,
        orderDetails,
        updateStatusLoading
    } = useSelector((state) => state.orders);

    useEffect(() => {
        const currentParams = {
            skip: pagination?.pageIndex ? pagination?.pageIndex * pagination?.pageSize : undefined,
            limit: pagination?.pageSize,
            sortKey: sorting[0]?.id,
            sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
            filterKey: filtering?.field,
            filterValue: filtering?.value
        };

        const handleServiceWorkerMessage = (event) => {
            handleManagerServiceWorkerMessage(event, {
                showToast: false,
                onOrderPlacement: () => {
                    dispatch(getCompletedOrdersRequest({ hotelId, params: currentParams }));
                },
                onOrdersRefresh: (meta) => {
                    dispatch(getCompletedOrdersRequest({ hotelId: meta.hotelId || hotelId, params: currentParams }));
                },
                onPaymentRequest: (meta) => {
                    dispatch(
                        setPaymentRequest({
                            title: 'Payment Request',
                            message: `Payment request for Table-${meta.tableNumber} of amount ${meta.totalPrice}. Please approve once the payment is done.`,
                            submitText: 'Approve',
                            tableId: meta.tableId,
                            customerId: meta.customerId
                        })
                    );
                }
            });
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }
        return () => {
            if (navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
        };
    }, [pagination, sorting, filtering, hotelId, dispatch]);

    useEffect(() => {
        const params = {
            skip: pagination?.pageIndex ? pagination?.pageIndex * pagination?.pageSize : undefined,
            limit: pagination?.pageSize,
            sortKey: sorting[0]?.id,
            sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
            filterKey: filtering?.field,
            filterValue: filtering?.value
        };

        const debounceTableFilters = debounce((hotelId, params) => {
            dispatch(getCompletedOrdersRequest({ hotelId, params }));
        }, 300);

        const cleanup = () => {
            debounceTableFilters.cancel();
        };
        debounceTableFilters(hotelId, params);
        return cleanup;
    }, [pagination, sorting[0]?.desc, sorting[0]?.id, filtering.field, filtering.value]);

    useEffect(() => {
        if (!updateStatusLoading && orderDetails) {
            // Status update completed successfully, close the modal
            // The modal will be automatically updated by the refresh from saga
        }
    }, [updateStatusLoading]);

    const handleDownloadInvoice = async () => {
        if (!orderDetails) return;

        try {
            await orderService.downloadInvoice(
                hotelId,
                orderDetails.orderId,
                orderDetails.hotelName || 'hotel',
                orderDetails.orderNumber || 'order'
            );
            toast.success('Invoice downloaded successfully');
        } catch (error) {
            console.error('Failed to download invoice', error);
            toast.error('Failed to download invoice');
        }
    };

    const handleMarkAsCompleted = () => {
        if (!orderDetails || orderDetails.orderStatus === 'CANCELLED') return;
        dispatch(updateOrderStatusRequest({
            hotelId,
            orderId: orderDetails.orderId,
            status: ORDER_STATUS[3]
        }));
    };

    const OrderDetailsModal = () => {
        if (!orderDetails) return null;

        const subtotal = orderDetails.subtotal !== undefined && orderDetails.subtotal !== null
            ? orderDetails.subtotal
            : (orderDetails.orderedItems || []).reduce((sum, item) => sum + (Number(item.itemPrice) || 0), 0);

        const sgst = orderDetails.sgst !== undefined && orderDetails.sgst !== null
            ? orderDetails.sgst
            : Math.round(subtotal * (2.5 / 100));

        const cgst = orderDetails.cgst !== undefined && orderDetails.cgst !== null
            ? orderDetails.cgst
            : Math.round(subtotal * (2.5 / 100));

        const tip = orderDetails.tipAmount !== undefined && orderDetails.tipAmount !== null
            ? orderDetails.tipAmount
            : 0;

        const totalAmount = orderDetails.totalAmount !== undefined && orderDetails.totalAmount !== null
            ? orderDetails.totalAmount
            : (subtotal + tip + sgst + cgst);

        return (
            <OMTModal
                show={true}
                title="Order Details"
                description={
                    <div className="order-details-container">
                        <Row className="mb-3">
                            <Col md={6}>
                                <p><strong>Order Number:</strong> {orderDetails.orderNumber}</p>
                                <p><strong>Table Number:</strong> {orderDetails.tableNumber}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong>Order Date/Time:</strong> {new Date(orderDetails.orderDateTime).toLocaleString()}</p>
                                <p><strong>Status:</strong> {orderDetails.orderStatus}</p>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <p><strong>Payment Mode:</strong> {orderDetails.paymentMode}</p>
                                <p><strong>Payment ID:</strong> {orderDetails.paymentId}</p>
                            </Col>
                        </Row>

                        <div className="mx-2 my-4 px-3 py-4 rounded table-borders">
                            <h6 className="fw-bold">Ordered Items:</h6>
                            <table className="table order-bill-table">
                                <thead className="table-borders">
                                    <tr>
                                        <th scope="col" className="col-4 fw-bold">Item</th>
                                        <th scope="col" className="col-2 text-center">Quantity</th>
                                        <th scope="col" className="col-3 text-end">Unit Price</th>
                                        <th scope="col" className="col-3 text-end">Total Price</th>
                                    </tr>
                                </thead>
                                <tbody className="table-borders">
                                    {orderDetails.orderedItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="col-4">{item.name}</td>
                                            <td className="col-2 text-center">{item.quantity}</td>
                                            <td className="col-3 text-end">{item.unitPrice}</td>
                                            <td className="col-3 text-end">{item.itemPrice}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td className="text-end fw-bold" colSpan="3">Subtotal:</td>
                                        <td className="text-end">₹ {subtotal}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-end fw-bold" colSpan="3">Tip:</td>
                                        <td className="text-end">₹ {tip}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-end fw-bold" colSpan="3">SGST:</td>
                                        <td className="text-end">₹ {sgst}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-end fw-bold" colSpan="3">CGST:</td>
                                        <td className="text-end">₹ {cgst}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-end fw-bold" colSpan="3">Final Amount:</td>
                                        <td className="text-end">₹ {totalAmount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                }
                handleClose={() => {
                    dispatch(clearOrderDetails());
                }}
                handleSubmit={handleMarkAsCompleted}
                size={'lg'}
                submitText={orderDetails.orderStatus !== 'COMPLETED' && orderDetails.orderStatus !== 'CANCELLED' ? 'Mark as Completed' : (orderDetails.orderStatus === 'CANCELLED' ? 'Order Cancelled' : null)}
                submitDisabled={orderDetails.orderStatus === 'CANCELLED'}
                closeText="Close"
                additionalButtons={[
                    {
                        text: 'Download Invoice',
                        onClick: handleDownloadInvoice,
                        variant: 'outline-primary'
                    }
                ]}
                isLoading={updateStatusLoading}
            />
        );
    };

    const columnHelper = createColumnHelper();
    const columns = [
        columnHelper.display({
            id: 'srNo',
            header: 'Sr. No.',
            minSize: 100,
            cell: ({ row }) => {
                if (!row.original || Object.keys(row.original).length === 0) return '';
                const pageIndex = pagination?.pageIndex || 0;
                const pageSize = pagination?.pageSize || 10;
                return <div>{pageIndex * pageSize + row.index + 1}</div>;
            }
        }),
        columnHelper.display({
            id: 'orderNumber',
            header: 'Order Number',
            minSize: 200,
            cell: ({ row }) => <div>{row.original?.orderNumber || '-'}</div>
        }),
        columnHelper.display({
            id: 'tableNumber',
            header: 'Table',
            minSize: 120,
            cell: ({ row }) => <div>{row.original?.tableNumber || '-'}</div>
        }),
        columnHelper.display({
            id: 'itemsSummary',
            header: 'Ordered Items',
            minSize: 300,
            cell: ({ row }) => {
                const items = row.original?.menu || [];
                const summary = items.map((item) => `${item.name} (x${item.quantity})`).join(', ');
                return <div>{summary || '-'}</div>;
            }
        }),
        columnHelper.display({
            id: 'totalPrice',
            header: 'Total Amount',
            minSize: 150,
            cell: ({ row }) => <div>{row.original?.totalPrice ?? '-'}</div>
        }),
        columnHelper.display({
            id: 'orderStatus',
            header: 'Status',
            minSize: 130,
            cell: ({ row }) => <div>{row.original?.orderStatus || '-'}</div>
        }),
        columnHelper.display({
            id: 'orderTime',
            header: 'Order Date/Time',
            minSize: 220,
            cell: ({ row }) => <div>{row.original?.orderTime ? new Date(row.original.orderTime).toLocaleString() : '-'}</div>
        }),
        columnHelper.display({
            id: 'view',
            header: 'Actions',
            enableSorting: false,
            enableFiltering: false,
            minSize: 150,
            cell: ({ row }) => {
                return row.original.menu ? (
                    <BsInfoCircleFill
                        color="#49AC60"
                        size={20}
                        role="button"
                        title="View Details"
                        onClick={() => {
                            dispatch(getOrderDetailsRequest({
                                hotelId,
                                orderId: row.original.orderId
                            }));
                        }}
                    />
                ) : (
                    <></>
                );
            }
        })
    ];

    const onSortingChange = (e) => {
        const sortDetails = e()[0];
        const data = [...sorting][0];
        if (!data || data.id !== sortDetails.id) {
            dispatch(setOrderSorting([{ id: sortDetails.id, desc: false }]));
            return;
        }

        dispatch(setOrderSorting([{ ...data, desc: !data.desc }]));
    };

    const BillingView = ({ order }) => {
        return (
            <>
                <Row>
                    <Col className="col-4 fw-bold">Customer Id : </Col>
                    <Col>{order.id}</Col>
                </Row>
                <div className="mx-2 my-4 px-3 py-4 rounded table-borders">
                    <h6 className="fw-bold">Order Menu:</h6>
                    <table className="table order-bill-table">
                        <thead className="table-borders">
                            <tr>
                                <th scope="col" className="col-6 fw-bold">
                                    Item
                                </th>
                                <th scope="col" className="text-center">
                                    Quantity
                                </th>
                                <th scope="col" className="text-end">
                                    Price
                                </th>
                            </tr>
                        </thead>
                        <tbody className="table-borders">
                            {(order?.menu || []).map((menuItem, index) => (
                                <tr key={index}>
                                    <td className="col-6 fw-bold">{menuItem.name}</td>
                                    <td className="text-center">{menuItem.quantity}</td>
                                    <td className="text-end">{menuItem.price}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="text-end fw-bold" colSpan="2">
                                    Price :
                                </td>
                                <td className="text-end">{order.price}</td>
                            </tr>
                            <tr>
                                <td className="text-end fw-bold" colSpan="2">
                                    Tip :
                                </td>
                                <td className="text-end">{order.tipAmount ?? 0}</td>
                            </tr>
                            <tr>
                                <td className="text-end fw-bold" colSpan="2">
                                    SGST :
                                </td>
                                <td className="text-end">{order.sgst}</td>
                            </tr>
                            <tr>
                                <td className="text-end fw-bold" colSpan="2">
                                    CGST :
                                </td>
                                <td className="text-end">{order.cgst}</td>
                            </tr>
                            <tr>
                                <td className="text-end fw-bold" colSpan="2">
                                    Final Amount :
                                </td>
                                <td className="text-end">{order.totalPrice}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    return (
        <div className="d-flex flex-column my-4">
            <div>
                <h6 className="mx-sm-5 mx-2">Orders</h6>
                <div className="mx-sm-5 mx-2 mb-3 d-flex gap-2 align-items-center">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={filtering?.field === 'tableNumber' ? 'Search by Table Number' : 'Search by Order Number'}
                        value={filtering?.value || ''}
                        onChange={(e) => {
                            dispatch(setOrderFiltering({ field: filtering?.field || 'orderNumber', value: e.target.value }));
                        }}
                        style={{ maxWidth: '300px' }}
                    />
                    <select
                        className="form-select"
                        value={filtering?.field || 'orderNumber'}
                        onChange={(e) => {
                            dispatch(setOrderFiltering({ field: e.target.value, value: filtering?.value || '' }));
                        }}
                        style={{ maxWidth: '180px' }}
                    >
                        <option value="orderNumber">Order Number</option>
                        <option value="tableNumber">Table Number</option>
                    </select>
                    {filtering?.value && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => {
                                dispatch(setOrderFiltering({ field: filtering?.field || 'orderNumber', value: '' }));
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                <Table
                    columns={columns}
                    data={completedOrders}
                    count={completedCount}
                    // pagination props
                    onPaginationChange={(paginate) => {
                        dispatch(setOrderPagination(paginate(pagination)));
                    }}
                    pagination={pagination}
                    // sorting props
                    onSortingChange={onSortingChange}
                    sorting={sorting}
                    // filtering props
                    onFilterChange={(e) => {
                        dispatch(setOrderFiltering({ field: e.target.name, value: e.target.value }));
                    }}
                    filtering={filtering}
                />
            </div>
            {selectedOrder && (
                <OMTModal
                    show={selectedOrder}
                    title={`${selectedOrder?.title}`}
                    description={<BillingView order={selectedOrder.data} />}
                    handleClose={() => {
                        dispatch(setSelectedOrder(false));
                    }}
                    size={'md'}
                    closeText={selectedOrder?.closeText}
                />
            )}
            {orderDetails && <OrderDetailsModal />}
            {paymentRequest && (
                <OMTModal
                    show={paymentRequest}
                    title={`${paymentRequest?.title}`}
                    description={<p>{paymentRequest.message}</p>}
                    handleSubmit={() => {
                        dispatch(
                            paymentConfirmationRequest({
                                manual: true,
                                customerId: paymentRequest.customerId
                            })
                        );
                    }}
                    size={'md'}
                    submitText={paymentRequest?.submitText}
                />
            )}
        </div>
    );
}

export default Orders;
