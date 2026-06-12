export type VerifyCustomerAccessParams = {
  code: string;
  email: string;
};

export type VerifyCustomerAccessResult = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export type AssignCustomerClassResult = VerifyCustomerAccessResult;

export type UseVerifiedCustomerAccessState = {
  loading: boolean;
  error: string;
  verifiedEmail: string;
};

export type UseVerifiedCustomerAccessReturn = () => {
  verifyAccess: (params: VerifyCustomerAccessParams) => Promise<VerifyCustomerAccessResult>;
  assignCustomerClass: (params: VerifyCustomerAccessParams) => Promise<AssignCustomerClassResult>;
  getPendingVerification: () => VerifyCustomerAccessParams | null;
  setPendingVerification: (params: VerifyCustomerAccessParams) => void;
  clearPendingVerification: () => void;
  loading: Ref<boolean>;
  error: Ref<string>;
  verifiedEmail: Ref<string>;
};
