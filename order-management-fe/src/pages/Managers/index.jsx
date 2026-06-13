import React, { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import CryptoJS from 'crypto-js';
import moment from 'moment';

import { MdDeleteForever } from 'react-icons/md';
import { TbKey, TbUserEdit } from 'react-icons/tb';
import { TiPlus } from 'react-icons/ti';
import { useDispatch, useSelector } from 'react-redux';
import ActionDropdown from '../../components/ActionDropdown';
import CustomButton from '../../components/CustomButton';
import OMTModal from '../../components/Modal';
import Table from '../../components/Table';
import env from '../../config/env';
import { getHotelRequest } from '../../store/slice';
import {
    createManagerRequest,
    getManagersRequest,
    removeManagerRequest,
    setFormInfo,
    setHotelOption,
    setSelectedRow,
    updateManagerCredentialsRequest,
    updateManagerRequest
} from '../../store/slice/manager.slice';

function Managers() {
    const { managerOptions, formInfo, data, selectedRow } = useSelector((state) => state.manager);
    const { data: hotels } = useSelector((state) => state.hotel);
    const dispatch = useDispatch();

    const updateOptions = (data) => {
        const { firstName, lastName, phoneNumber, email, id, hotel, createdAt } = data;

        const hotels = [];
        if (Object.keys(hotel).length) {
            hotels.push({ label: hotel.name, value: hotel.id });
        }

        return {
            action: 'update',
            title: 'Update Manager',
            managerId: id,
            initialValues: {
                name: firstName + ' ' + lastName,
                phoneNumber,
                email,
                password: '',
                hotel: hotels,
                onboarded: moment(createdAt).format('DD-MMM-YYYY')
            },
            submitText: 'Update',
            closeText: 'Close'
        };
    };

    const editCredentialsOptions = (data) => {
        const { email, id } = data;
        return {
            ...credentialsOptions,
            managerId: id,
            initialValues: {
                email,
                password: ''
            }
        };
    };

    const createOptions = {
        action: 'create',
        title: 'Create New Manager',
        initialValues: {
            name: '',
            phoneNumber: '',
            email: '',
            password: '',
            hotel: [],
            onboarded: ''
        },
        submitText: 'Create',
        closeText: 'Close'
    };

    const credentialsOptions = {
        action: 'credentials',
        title: 'Edit Manager Credentials',
        initialValues: {
            email: '',
            password: ''
        },
        submitText: 'Update Credentials',
        closeText: 'Close'
    };

    const getHotelOptions = (currentHotelId) => {
        const assignedHotelIds = data?.rows?.map((row) => row?.hotel?.id).filter(Boolean) || [];
        return (
            hotels?.rows
                ?.filter((hotel) => hotel?.id === currentHotelId || !assignedHotelIds.includes(hotel?.id))
                .map((row) => ({ label: row?.name, value: row?.id })) || []
        );
    };

    const credentialFields = {
        email: {
            ...managerOptions.email,
            label: 'Manager Login ID / Email',
            required: false,
            disabled: false
        },
        password: {
            ...managerOptions.password,
            label: 'Password (leave blank to keep current)',
            required: false,
            disabled: false
        }
    };

    let formFields = {
        ...managerOptions,
        hotel: {
            ...managerOptions.hotel,
            options: getHotelOptions(formInfo?.initialValues?.hotel?.[0]?.value)
        },
        name: {
            ...managerOptions.name,
            disabled: formInfo?.action === 'update'
        },
        phoneNumber: {
            ...managerOptions.phoneNumber,
            disabled: formInfo?.action === 'update'
        },
        email: {
            ...managerOptions.email,
            disabled: formInfo?.action === 'update'
        },
        password: {
            ...managerOptions.password,
            disabled: formInfo?.action === 'update'
        }
    };

    if (formInfo?.action === 'credentials') {
        formFields = credentialFields;
    }

    /** ** pagination state ****/
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10
    });

    /** ** sorting state ****/
    const [sorting, setSorting] = useState([]);

    /** ** filtering state ****/
    const [filtering, setFiltering] = useState(null);

    /** ** table pagination start ****/
    const onPaginationChange = (e) => {
        setPagination(e);
    };

    /** ** table filtering start ****/
    const onFilterChange = (e) => {
        const name = e.target.name;
        const value = e.target.value;

        setFiltering({
            field: name,
            value
        });
    };
    /** ** table filtering emd ****/

    /** ** table sorting start ****/
    const onSortingChange = (e) => {
        const sortDetails = e()[0];
        const data = [...sorting][0];
        if (!data || data.id !== sortDetails.id) {
            setSorting([{ id: sortDetails.id, desc: false }]);
            return;
        }

        setSorting([{ ...data, desc: !data.desc }]);
    };

    useEffect(() => {
        if (!hotels?.rows?.length) {
            dispatch(getHotelRequest());
        }
        dispatch(
            setHotelOption(
                hotels?.rows?.map((row) => {
                    return { label: row?.name, value: row?.id };
                })
            )
        );
    }, [Object.keys(hotels).length]);

    useEffect(() => {
        dispatch(getManagersRequest());
    }, []);

    const handleDelete = async () => {
        const id = selectedRow?.id;
        dispatch(removeManagerRequest({ id }));
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        setSubmitting(true);
        if (formInfo?.action === 'create') {
            const nameParts = (values.name || '').trim().split(' ').filter(Boolean);
            const firstName = nameParts.shift() || '';
            const lastName = nameParts.join(' ') || '';
            const payload = {
                firstName,
                lastName,
                phoneNumber: values.phoneNumber,
                email: values.email,
                password: CryptoJS.AES.encrypt(values.password, env.cryptoSecret).toString(),
                hotelId: values.hotel?.value
            };
            dispatch(createManagerRequest(payload));
        } else if (formInfo?.action === 'credentials') {
            const { managerId } = formInfo;
            const payload = {
                email: values.email
            };
            if (values.password) {
                payload.password = CryptoJS.AES.encrypt(values.password, env.cryptoSecret).toString();
            }
            dispatch(updateManagerCredentialsRequest({ id: managerId, data: payload }));
        } else {
            const { initialValues, managerId } = formInfo;
            const payload = {
                prev: initialValues?.hotel[0]?.value,
                current: values?.hotel?.value
            };
            dispatch(updateManagerRequest({ id: managerId, data: payload }));
        }
        setSubmitting(false);
    };

    const columnHelper = createColumnHelper();
    const columns = [
        columnHelper.display({
            id: 'name',
            header: 'Manager Name',
            minSize: 200,
            cell: ({ row }) => {
                return row?.original?.firstName ? (
                    <div>{row?.original?.firstName + ' ' + row?.original?.lastName}</div>
                ) : (
                    <></>
                );
            }
        }),
        columnHelper.display({
            id: 'phoneNumber',
            header: 'Contact Number',
            minSize: 150,
            cell: ({ row }) => <div>{row?.original?.phoneNumber}</div>
        }),
        columnHelper.display({
            id: 'hotelName',
            header: 'Assigned Cafe',
            minSize: 200,
            cell: ({ row }) => <div>{row?.original?.hotel?.name || '-'}</div>
        }),
        columnHelper.display({
            id: 'hotelLocation',
            header: 'Cafe Location',
            minSize: 200,
            cell: ({ row }) => <div>{row?.original?.hotel?.address || '-'}</div>
        }),
        columnHelper.display({
            id: 'createdAt',
            header: 'Date of Joining',
            minSize: 150,
            cell: ({ row }) =>
                row?.original?.createdAt && <div>{moment(row?.original?.createdAt).format('DD-MMM-YYYY')}</div>
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            enableSorting: 'FALSE',
            enableFiltering: 'FALSE',
            minSize: 150,
            cell: ({ row }) => {
                return row?.original?.id ? (
                    <ActionDropdown
                        options={[
                            {
                                label: 'Edit',
                                icon: TbUserEdit,
                                onClick: () => {
                                    dispatch(setFormInfo(updateOptions(row.original)));
                                }
                            },
                            {
                                label: 'Edit Credentials',
                                icon: TbKey,
                                onClick: () => {
                                    dispatch(setFormInfo(editCredentialsOptions(row.original)));
                                }
                            },
                            {
                                label: 'Delete',
                                icon: MdDeleteForever,
                                onClick: () => {
                                    dispatch(setSelectedRow(row.original));
                                }
                            }
                        ]}
                    />
                ) : null;
            }
        })
    ];

    return (
        <>
            <div className="heading-container">
                <h4 className="text-center text-white pt-5">Managers</h4>
            </div>
            <div className="text-end px-2 px-md-5 my-4">
                <CustomButton
                    className="d-flex border-none gap-2 ms-auto"
                    disabled={false}
                    label={
                        <span className="d-flex align-items-center">
                            <TiPlus size={20} color="white" />
                            <span className="mx-2">Add Manager</span>
                        </span>
                    }
                    onClick={() => dispatch(setFormInfo(createOptions))}
                />
            </div>
            <div className="my-5">
                <Table
                    columns={columns}
                    data={data?.rows}
                    count={data?.count || 0}
                    onPaginationChange={onPaginationChange}
                    pagination={pagination}
                    onFilterChange={onFilterChange}
                    filtering={filtering}
                    onSortingChange={onSortingChange}
                />
            </div>
            <OMTModal
                show={formInfo}
                type="form"
                title={formInfo?.title}
                initialValues={formInfo.initialValues}
                handleSubmit={handleSubmit}
                description={formFields}
                handleClose={() => {
                    dispatch(setFormInfo(false));
                }}
                isFooter={false}
                size={'lg'}
                submitText={formInfo.submitText}
                closeText={formInfo.closeText}
            />
            <OMTModal
                show={selectedRow}
                size="md"
                closeText={'Cancel'}
                submitText={'Delete'}
                title={'Delete Manager'}
                description={
                    <>
                        <div>
                            Are you sure you want to remove{' '}
                            <span className="fw-bold">{`${selectedRow.firstName} ${selectedRow.lastName}`}</span> from
                            our app ?
                        </div>
                        <br />
                        <div className="fw-bold">
                            Note: This action is irreversible and will delete all associated data and listings for this
                            hotel.
                        </div>
                    </>
                }
                handleClose={() => dispatch(setSelectedRow(false))}
                handleSubmit={handleDelete}
            />
        </>
    );
}

export default Managers;
