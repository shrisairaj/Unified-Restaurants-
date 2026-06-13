import { createSlice } from '@reduxjs/toolkit';
import { FIELD_CLASS } from '../../utils/constants';
import { MANAGER } from '../types';

const managerSlice = createSlice({
    name: MANAGER,
    initialState: {
        selectedRow: false,
        isRemoveManager: false,
        data: {},
        formInfo: false,
        managerOptions: {
            name: {
                name: 'name',
                type: 'text',
                label: 'Manager Name',
                className: FIELD_CLASS,
                disabled: false,
                required: true
            },
            phoneNumber: {
                name: 'phoneNumber',
                type: 'number',
                label: 'Phone Number',
                className: FIELD_CLASS,
                disabled: false,
                required: true
            },
            email: {
                name: 'email',
                type: 'text',
                label: 'Manager Login ID / Email',
                className: FIELD_CLASS,
                disabled: false,
                required: true
            },
            password: {
                name: 'password',
                type: 'password',
                label: 'Password',
                className: FIELD_CLASS,
                disabled: false,
                required: true
            },
            onboarded: {
                name: 'onboarded',
                type: 'text',
                label: 'Onboarded',
                className: FIELD_CLASS,
                disabled: true
            },
            hotel: {
                name: 'hotel',
                type: 'select',
                label: 'Assigned Cafe/Hotel',
                className: FIELD_CLASS,
                isMulti: false,
                options: [],
                required: true
            }
        }
    },
    reducers: {
        setSelectedRow(state, action) {
            state.selectedRow = action.payload;
        },
        getManagersRequest() {},
        getManagerSuccess(state, action) {
            state.data = action.payload;
        },
        setFormInfo(state, action) {
            state.formInfo = action.payload;
        },
        createManagerRequest() {},
        updateManagerRequest() {},
        updateManagerCredentialsRequest() {},
        removeManagerRequest() {},
        setHotelOption(state, action) {
            state.managerOptions.hotel.options = action.payload;
        }
    }
});

export const {
    setSelectedRow,
    getManagersRequest,
    getManagerSuccess,
    setFormInfo,
    createManagerRequest,
    updateManagerRequest,
    updateManagerCredentialsRequest,
    removeManagerRequest,
    setHotelOption
} = managerSlice.actions;

export const managerReducer = managerSlice.reducer;
