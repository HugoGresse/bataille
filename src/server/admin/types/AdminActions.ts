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

export type AdminActions = AdminActionSendMessage
