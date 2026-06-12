import type { ApiError } from '@plentymarkets/shop-api';

/**
 * @description Composable to fetch current session data including user and cart information.
 * @example
 * ``` ts
 * const { loading, fetchSession } = useFetchSession();
 * ```
 */
export const useFetchSession = () => {
  const state = useState(`useFetchSession`, () => ({
    loading: false,
  }));

  const hasVerifiedCustomerAccessDebug = () =>
    typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('verifiedCustomerAccess.debug');

  /** Function for getting current user/cart data from session
   * @example
   * ``` ts
   * fetchSession();
   * ```
   */
  const fetchSession = async () => {
    state.value.loading = true;
    try {
      const { data } = await useSdk().plentysystems.getSession();
      if (hasVerifiedCustomerAccessDebug()) {
        console.error('[VerifiedCustomerAccess] getSession API response', data);
      }

      const { setCart } = useCart();
      const { setUser } = useCustomer();
      if (data) {
        setCart(data.basket);
        setUser(data.user);
      }
    } catch (error) {
      useHandleError(error as ApiError);
    } finally {
      state.value.loading = false;
    }
  };

  return {
    fetchSession,
    ...toRefs(state.value),
  };
};
