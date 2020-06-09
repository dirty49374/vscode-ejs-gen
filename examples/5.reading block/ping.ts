export interface PingRequest {}

export interface PingResponse {}

export const PingHandler = async (req: PingRequest): Promise<PingResponse> => {
    return {};
}
