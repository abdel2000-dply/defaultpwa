<template>
  <NuxtLayout name="auth" :heading="''">
    <div class="mx-auto w-full max-w-[440px] px-4 my-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold">{{ t('verifiedCustomerAccess.heading') }}</h1>
        <p class="mt-2 text-neutral-600">{{ t('verifiedCustomerAccess.subheading') }}</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submitVerification">
        <label>
          <UiFormLabel>{{ t('verifiedCustomerAccess.codeLabel') }} {{ t('form.required') }}</UiFormLabel>
          <SfInput v-model="code" name="accessCode" autocomplete="one-time-code" required />
        </label>

        <label>
          <UiFormLabel>{{ t('form.emailLabel') }} {{ t('form.required') }}</UiFormLabel>
          <SfInput v-model="email" name="email" type="email" autocomplete="email" required />
        </label>

        <p v-if="error" class="rounded-md bg-negative-100 px-3 py-2 text-negative-700 text-sm" role="alert">
          {{ error }}
        </p>

        <UiButton type="submit" class="mt-2" :disabled="isSubmitting">
          <SfLoaderCircular v-if="isSubmitting" class="flex justify-center items-center" size="base" />
          <span v-else>{{ t('verifiedCustomerAccess.submitLabel') }}</span>
        </UiButton>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { SfInput, SfLoaderCircular } from '@storefront-ui/vue';
import { userGetters } from '@plentymarkets/shop-api';
import type { Locale } from '#i18n';

defineI18nRoute({
  locales: process.env.LANGUAGELIST?.split(',') as Locale[],
});

definePageMeta({
  layout: false,
  middleware: ['guest-guard'],
});

const { setPageMeta } = usePageMeta();
setPageMeta(t('verifiedCustomerAccess.heading'), 'page');
useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});

const router = useRouter();
const localePath = useLocalePath();
const { send } = useNotification();
const { verifyAccess, assignCustomerClass, loading, error } = useVerifiedCustomerAccess();

const code = ref('');
const email = ref('');
const assigning = ref(false);
const isSubmitting = computed(() => loading.value || assigning.value);

const getAuthPath = (data: unknown) => {
  if (typeof data === 'string') {
    return data.toLowerCase().includes('register') ? paths.register : paths.authLogin;
  }

  if (!data || typeof data !== 'object') return paths.authLogin;

  const record = data as Record<string, unknown>;
  const action = record.nextAction ?? record.action ?? record.type ?? record.nextStep ?? record.authAction;

  return typeof action === 'string' && action.toLowerCase().includes('register') ? paths.register : paths.authLogin;
};

const getAuthAction = (data: unknown) => {
  if (!data || typeof data !== 'object') return 'login';

  const record = data as Record<string, unknown>;
  const action = record.nextAction ?? record.action ?? record.type ?? record.nextStep ?? record.authAction;

  return typeof action === 'string' && action.toLowerCase().includes('register') ? 'register' : 'login';
};

const getSuccessMessage = (data: unknown) =>
  getAuthAction(data) === 'register'
    ? t('verifiedCustomerAccess.noRecordFound')
    : t('verifiedCustomerAccess.loginVerified');

const submitVerification = async () => {
  if (!code.value.trim()) {
    error.value = t('verifiedCustomerAccess.codeRequired');
    return;
  }

  if (!userGetters.isValidEmailAddress(email.value)) {
    error.value = t('error.email.valid');
    return;
  }

  const result = await verifyAccess({ code: code.value, email: email.value });
  if (!result.success) {
    send({ message: result.message || t('verifiedCustomerAccess.error'), type: 'negative' });
    return;
  }

  assigning.value = true;
  const assignmentResult = await assignCustomerClass({ code: code.value, email: email.value });
  assigning.value = false;

  if (!assignmentResult.success) {
    error.value = assignmentResult.message || t('verifiedCustomerAccess.error');
    send({ message: error.value, type: 'negative' });
    return;
  }

  const successMessage = getSuccessMessage(result.data);
  send({ message: successMessage, type: 'positive' });
  const redirectUrl = router.currentRoute.value.query.redirect as string;
  const authPath = getAuthPath(result.data);

  await navigateTo({
    path: localePath(authPath),
    query: {
      ...(redirectUrl ? { redirect: redirectUrl } : {}),
    },
  });
};
</script>
