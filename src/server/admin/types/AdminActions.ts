import { AdminActionsTypes } from '../../../common/SOCKET_EMIT'

export type AdminActionBase = {
    type: AdminActionsTypes
    payload: any
}

export type AdminActionSendMessage = {
    type: AdminActionsTypes.sendMessage
    payload: {
        message: string
    }
}

export type AdminActionGetStats = {
    type: AdminActionsTypes.getStats
    payload: {
        /** YYYY-MM-DD inclusive */
        from: string
        /** YYYY-MM-DD inclusive */
        to: string
    }
}

export type AdminActions = AdminActionSendMessage | AdminActionGetStats
