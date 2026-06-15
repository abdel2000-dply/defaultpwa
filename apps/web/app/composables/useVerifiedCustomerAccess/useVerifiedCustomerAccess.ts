import type {
  AssignCustomerClassResult,
  UseVerifiedCustomerAccessReturn,
  UseVerifiedCustomerAccessState,
  VerifyCustomerAccessParams,
  VerifyCustomerAccessResult,
} from './types';

const extractMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) {
    return normalizeBackendMessage(payload.length > 300 ? fallback : payload);
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.detail;
    if (typeof message === 'string' && message.trim()) return normalizeBackendMessage(message);
  }

  return fallback;
};

const normalizeBackendMessage = (message: string) => {
  if (/verification code has already been used/i.test(message)) {
    return t('verifiedCustomerAccess.maxUsageReached');
  }

  return message;
};

const isHtmlResponse = (text: string) => /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return { payload: null, isHtml: false };

  try {
    return { payload: JSON.parse(text), isHtml: false };
  } catch {
    if (isHtmlResponse(text)) {
      return { payload: null, isHtml: true };
    }

    return { payload: text, isHtml: false };
  }
};

const hasSuccessfulPayload = (payload: unknown) =>
  !!payload && typeof payload === 'object' && (payload as Record<string, unknown>).success === true;

const hasFailedPayload = (payload: unknown) =>
  !!payload && typeof payload === 'object' && (payload as Record<string, unknown>).success === false;

const needsAuthenticatedCustomer = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return false;

  const message = (payload as Record<string, unknown>).message;
  return typeof message === 'string' && /log in|registration/i.test(message);
};

export const useVerifiedCustomerAccess: UseVerifiedCustomerAccessReturn = () => {
  const state = useState<UseVerifiedCustomerAccessState>('useVerifiedCustomerAccess', () => ({
    loading: false,
    error: '',
    verifiedEmail: '',
  }));

  const requestVerifiedCustomerAccess = async (
    endpoint: string,
    params: VerifyCustomerAccessParams,
  ): Promise<VerifyCustomerAccessResult> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        code: params.code.trim(),
        email: params.email.trim(),
      }),
    });
    const { payload, isHtml } = await parseResponse(response);
    console.warn('[VerifiedCustomerAccess] API response', {
      endpoint,
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      isHtml,
      payload,
    });

    if (isHtml) {
      const message = t('verifiedCustomerAccess.error');
      return { success: false, message };
    }

    if (hasFailedPayload(payload)) {
      const message = extractMessage(payload, t('verifiedCustomerAccess.error'));
      return { success: false, message, data: payload };
    }

    if (!response.ok && !hasSuccessfulPayload(payload)) {
      const message = extractMessage(payload, t('verifiedCustomerAccess.error'));
      return { success: false, message, data: payload };
    }

    if (needsAuthenticatedCustomer(payload)) {
      const message = extractMessage(payload, t('verifiedCustomerAccess.error'));
      return { success: false, message, data: payload };
    }

    return {
      success: true,
      message: extractMessage(payload, t('verifiedCustomerAccess.success')),
      data: payload,
    };
  };

  const verifyAccess = async (params: VerifyCustomerAccessParams): Promise<VerifyCustomerAccessResult> => {
    state.value.loading = true;
    state.value.error = '';
    state.value.verifiedEmail = '';

    try {
      const result = await requestVerifiedCustomerAccess('/rest/verified-customer-access/verify-access', params);
      if (!result.success) {
        state.value.error = result.message || t('verifiedCustomerAccess.error');
        return result;
      }

      state.value.verifiedEmail = params.email.trim();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('verifiedCustomerAccess.error');
      state.value.error = message;
      return { success: false, message };
    } finally {
      state.value.loading = false;
    }
  };

  const assignCustomerClass = async (params: VerifyCustomerAccessParams): Promise<AssignCustomerClassResult> => {
    try {
      return await requestVerifiedCustomerAccess('/rest/verified-customer-access/assign-customer-class', params);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('verifiedCustomerAccess.error');
      return { success: false, message };
    }
  };

  return {
    verifyAccess,
    assignCustomerClass,
    ...toRefs(state.value),
  };
};
