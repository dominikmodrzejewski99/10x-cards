import { UserDTO } from '../../../types';

export interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  error: string | null;
  authChecked: boolean;
}

export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
  authChecked: false
};
