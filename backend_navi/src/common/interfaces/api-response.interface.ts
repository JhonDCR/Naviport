export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface JwtPayload {
  sub: string;
  correo: string;
  rol: string;
  nombre: string;
}
