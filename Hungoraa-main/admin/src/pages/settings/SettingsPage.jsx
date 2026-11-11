import { useEffect, useState } from 'react';
import {
  Stack, Title, Card, Text, NumberInput, Switch, Button, Grid,
  TextInput, Divider, Group, Skeleton, SegmentedControl, Alert,
  FileInput, Image, Progress, MultiSelect,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconUpload, IconMovie, IconTrash } from '@tabler/icons-react';
import { adminApi, restaurantApi } from '../../api';


export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data.data.settings),
  });

  const platformForm = useForm({
    initialValues: {
      defaultCommission: 10,
      otpExpiry: 5,
      maxOtpAttempts: 5,
      accessTokenExpiry: '7d',
      maxRefreshDevices: 5,
      bookingCancellationHours: 2,
    },
  });

  const featureForm = useForm({
    initialValues: {
      enableWallet: true,
      enableGoogleLogin: true,
      enableRazorpay: true,
      enableSmsOtp: true,
      enableEmailVerification: true,
      maintenanceMode: false,
    },
  });

  const feeForm = useForm({
    initialValues: {
      convenienceFeeEnabled: true,
      convenienceFeeType: 'flat',
      convenienceFeeValue: 6,
      convenienceFeeCap: 25,
      convenienceFeeMinBill: 0,
      gstOnFeePercent: 18,
      convenienceFeeWaived: false,
    },
  });

  const appDiscountForm = useForm({
    initialValues: {
      appDiscountEnabled: false,
      appDiscountType: 'percent',
      appDiscountValue: 0,
      appDiscountCap: 0,
      appDiscountMinBill: 0,
      appDiscountScope: 'all',
      appDiscountRestaurants: [],
    },
  });

  const { data: restaurantData } = useQuery({
    queryKey: ['admin-all-restaurants'],
    queryFn: () => restaurantApi.getAll({ limit: 500 }).then((r) => r.data.data),
  });
  const restaurantOptions = (restaurantData?.restaurants || [])
    .map((r) => ({ value: r._id, label: r.address?.city ? `${r.name} · ${r.address.city}` : r.name }));

  const heroForm = useForm({
    initialValues: {
      homeHeroEnabled: false,
      homeHeroImageUrl: '',
      homeHeroVideoUrl: '',
    },
  });
  const [heroUploading, setHeroUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null); // null = idle, 0–100 = uploading

  const uploadHeroVideo = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      notifications.show({ title: 'Video too large', message: 'Keep it under 50 MB — a 10–20 s loop is ideal', color: 'red' });
      return;
    }
    setVideoProgress(0);
    try {
      const { data } = await adminApi.uploadVideo(file, setVideoProgress);
      heroForm.setFieldValue('homeHeroVideoUrl', data.data.url);
      heroForm.setFieldValue('homeHeroEnabled', true);
      notifications.show({ title: 'Video uploaded — click Save Background', color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err.response?.data?.message || 'Use an MP4 / WebM / MOV under 50 MB',
        color: 'red',
      });
    } finally {
      setVideoProgress(null);
    }
  };

  const uploadHeroImage = async (file) => {
    if (!file) return;
    setHeroUploading(true);
    try {
      const { data } = await adminApi.uploadAsset(file);
      heroForm.setFieldValue('homeHeroImageUrl', data.data.url);
      heroForm.setFieldValue('homeHeroEnabled', true);
      notifications.show({ title: 'Image uploaded — click Save Background', color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err.response?.data?.message || 'Use a JPG / PNG / WebP under 5 MB',
        color: 'red',
      });
    } finally {
      setHeroUploading(false);
    }
  };

  const landingForm = useForm({
    initialValues: { landingHeroImageUrl: '' },
  });
  const [landingUploading, setLandingUploading] = useState(false);

  const uploadLandingImage = async (file) => {
    if (!file) return;
    setLandingUploading(true);
    try {
      const { data } = await adminApi.uploadAsset(file);
      landingForm.setFieldValue('landingHeroImageUrl', data.data.url);
      notifications.show({ title: 'Image uploaded — click Save Landing Image', color: 'green' });
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err.response?.data?.message || 'Use a JPG / PNG / WebP under 5 MB',
        color: 'red',
      });
    } finally {
      setLandingUploading(false);
    }
  };

  useEffect(() => {
    if (!settingsData) return;
    platformForm.setValues({
      defaultCommission: settingsData.defaultCommission ?? 10,
      otpExpiry: settingsData.otpExpiry ?? 5,
      maxOtpAttempts: settingsData.maxOtpAttempts ?? 5,
      accessTokenExpiry: settingsData.accessTokenExpiry ?? '7d',
      maxRefreshDevices: settingsData.maxRefreshDevices ?? 5,
      bookingCancellationHours: settingsData.bookingCancellationHours ?? 2,
    });
    featureForm.setValues({
      enableWallet: settingsData.enableWallet ?? true,
      enableGoogleLogin: settingsData.enableGoogleLogin ?? true,
      enableRazorpay: settingsData.enableRazorpay ?? true,
      enableSmsOtp: settingsData.enableSmsOtp ?? true,
      enableEmailVerification: settingsData.enableEmailVerification ?? true,
      maintenanceMode: settingsData.maintenanceMode ?? false,
    });
    feeForm.setValues({
      convenienceFeeEnabled: settingsData.convenienceFeeEnabled ?? true,
      convenienceFeeType: settingsData.convenienceFeeType ?? 'flat',
      convenienceFeeValue: settingsData.convenienceFeeValue ?? 6,
      convenienceFeeCap: settingsData.convenienceFeeCap ?? 25,
      convenienceFeeMinBill: settingsData.convenienceFeeMinBill ?? 0,
      gstOnFeePercent: settingsData.gstOnFeePercent ?? 18,
      convenienceFeeWaived: settingsData.convenienceFeeWaived ?? false,
    });
    appDiscountForm.setValues({
      appDiscountEnabled: settingsData.appDiscountEnabled ?? false,
      appDiscountType: settingsData.appDiscountType ?? 'percent',
      appDiscountValue: settingsData.appDiscountValue ?? 0,
      appDiscountCap: settingsData.appDiscountCap ?? 0,
      appDiscountMinBill: settingsData.appDiscountMinBill ?? 0,
      appDiscountScope: settingsData.appDiscountScope ?? 'all',
      appDiscountRestaurants: (settingsData.appDiscountRestaurants || []).map(String),
    });
    heroForm.setValues({
      homeHeroEnabled: settingsData.homeHeroEnabled ?? false,
      homeHeroImageUrl: settingsData.homeHeroImageUrl ?? '',
      homeHeroVideoUrl: settingsData.homeHeroVideoUrl ?? '',
    });
    landingForm.setValues({
      landingHeroImageUrl: settingsData.landingHeroImageUrl ?? '',
    });
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data) => adminApi.updateSettings(data),
    onSuccess: () => {
      notifications.show({ title: 'Settings saved', color: 'green' });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => notifications.show({ title: 'Failed to save', color: 'red' }),
  });

  if (isLoading) {
    return (
      <Stack gap="lg">
        <Title order={2}>Platform Settings</Title>
        <Skeleton height={400} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Platform Settings</Title>

      <Grid gutter="md">
        {/* Platform Config */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="lg" size="lg">General Configuration</Text>
            <form onSubmit={platformForm.onSubmit((v) => updateMutation.mutate(v))}>
              <Stack gap="md">
                <NumberInput
                  label="Default Commission (%)"
                  description="Applied to new restaurants"
                  min={0} max={50}
                  {...platformForm.getInputProps('defaultCommission')}
                />
                <NumberInput
                  label="OTP Expiry (minutes)"
                  min={1} max={30}
                  {...platformForm.getInputProps('otpExpiry')}
                />
                <NumberInput
                  label="Max OTP Attempts"
                  min={1} max={10}
                  {...platformForm.getInputProps('maxOtpAttempts')}
                />
                <TextInput
                  label="Access Token Expiry"
                  placeholder="7d, 24h, etc."
                  {...platformForm.getInputProps('accessTokenExpiry')}
                />
                <NumberInput
                  label="Max Devices per User"
                  description="Max refresh tokens stored"
                  min={1} max={20}
                  {...platformForm.getInputProps('maxRefreshDevices')}
                />
                <NumberInput
                  label="Cancellation Window (hours)"
                  description="Min hours before booking to allow cancellation"
                  min={0} max={72}
                  {...platformForm.getInputProps('bookingCancellationHours')}
                />
                <Button type="submit" color="gold" leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateMutation.isPending}>
                  Save Settings
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        {/* Feature Toggles */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="lg" size="lg">Feature Toggles</Text>
            <Stack gap="lg">
              {[
                { field: 'enableWallet', label: 'Wallet System', desc: 'Allow users to add money to wallet' },
                { field: 'enableGoogleLogin', label: 'Google Login', desc: 'OAuth via Google' },
                { field: 'enableRazorpay', label: 'Razorpay Payments', desc: 'Online payment processing' },
                { field: 'enableSmsOtp', label: 'SMS OTP (Twilio)', desc: 'Phone verification via SMS' },
                { field: 'enableEmailVerification', label: 'Email Verification', desc: 'Require email verification on signup' },
                { field: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Block all user access to app' },
              ].map(({ field, label, desc }) => (
                <Group key={field} justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>{label}</Text>
                    <Text size="xs" c="dimmed">{desc}</Text>
                  </Stack>
                  <Switch
                    checked={featureForm.values[field]}
                    onChange={(e) => featureForm.setFieldValue(field, e.target.checked)}
                    color={field === 'maintenanceMode' ? 'red' : 'brand'}
                  />
                </Group>
              ))}
              <Divider />
              <Button color="gold" leftSection={<IconDeviceFloppy size={16} />}
                loading={updateMutation.isPending}
                onClick={() => updateMutation.mutate(featureForm.values)}>
                Save Feature Settings
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        {/* Pay Bill — Convenience Fee & GST */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb={4} size="lg">Pay Bill — Convenience Fee &amp; GST</Text>
            <Text size="xs" c="dimmed" mb="lg">
              Charged to the diner on top of (bill − discount). Platform revenue —
              it does not affect the restaurant&apos;s payout or commission.
            </Text>
            <form onSubmit={feeForm.onSubmit((v) => updateMutation.mutate(v))}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>Charge a convenience fee</Text>
                    <Text size="xs" c="dimmed">Turn off to make Pay Bill fee-free</Text>
                  </Stack>
                  <Switch
                    checked={feeForm.values.convenienceFeeEnabled}
                    onChange={(e) => feeForm.setFieldValue('convenienceFeeEnabled', e.target.checked)}
                    color="brand"
                  />
                </Group>

                <div>
                  <Text size="sm" fw={500} mb={6}>Fee type</Text>
                  <SegmentedControl
                    fullWidth
                    data={[{ label: 'Flat ₹', value: 'flat' }, { label: 'Percent %', value: 'percent' }]}
                    value={feeForm.values.convenienceFeeType}
                    onChange={(v) => feeForm.setFieldValue('convenienceFeeType', v)}
                    disabled={!feeForm.values.convenienceFeeEnabled}
                  />
                </div>

                <NumberInput
                  label={feeForm.values.convenienceFeeType === 'percent' ? 'Fee (% of bill after discount)' : 'Fee amount (₹)'}
                  min={0}
                  max={feeForm.values.convenienceFeeType === 'percent' ? 30 : 500}
                  decimalScale={2}
                  disabled={!feeForm.values.convenienceFeeEnabled}
                  {...feeForm.getInputProps('convenienceFeeValue')}
                />

                {feeForm.values.convenienceFeeType === 'percent' && (
                  <NumberInput
                    label="Fee cap (₹)"
                    description="Max fee when using a percentage · 0 = no cap"
                    min={0} max={1000}
                    disabled={!feeForm.values.convenienceFeeEnabled}
                    {...feeForm.getInputProps('convenienceFeeCap')}
                  />
                )}

                <NumberInput
                  label="Waive fee below bill (₹)"
                  description="Bills under this pay no convenience fee · 0 = always charge"
                  min={0} max={5000}
                  disabled={!feeForm.values.convenienceFeeEnabled}
                  {...feeForm.getInputProps('convenienceFeeMinBill')}
                />

                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>Waive the fee — show as FREE</Text>
                    <Text size="xs" c="dimmed">
                      App shows the fee struck out (e.g. <s>₹{feeForm.values.convenienceFeeValue || 0}</s> FREE) and charges ₹0
                    </Text>
                  </Stack>
                  <Switch
                    checked={feeForm.values.convenienceFeeWaived}
                    onChange={(e) => feeForm.setFieldValue('convenienceFeeWaived', e.target.checked)}
                    disabled={!feeForm.values.convenienceFeeEnabled}
                    color="green"
                  />
                </Group>

                <NumberInput
                  label="GST on the convenience fee (%)"
                  description="Tax added on the fee itself (India: 18)"
                  min={0} max={28}
                  {...feeForm.getInputProps('gstOnFeePercent')}
                />

                <Alert color="blue" variant="light" p="sm">
                  <Text size="xs">
                    Example on a ₹1,000 bill, 15% off →{' '}
                    <b>
                      ₹{(() => {
                        const base = 850;
                        const f = feeForm.values.convenienceFeeEnabled && !feeForm.values.convenienceFeeWaived && base >= (feeForm.values.convenienceFeeMinBill || 0)
                          ? (feeForm.values.convenienceFeeType === 'percent'
                            ? Math.min(base * (feeForm.values.convenienceFeeValue || 0) / 100, feeForm.values.convenienceFeeCap || Infinity)
                            : (feeForm.values.convenienceFeeValue || 0))
                          : 0;
                        const g = f * (feeForm.values.gstOnFeePercent || 0) / 100;
                        return (base + f + g).toFixed(2);
                      })()}
                    </b>{' '}
                    to pay (fee + GST included)
                  </Text>
                </Alert>

                <Button type="submit" color="gold" leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateMutation.isPending}>
                  Save Fee Settings
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        {/* Pay Bill — Hungora app discount (platform-funded) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb={4} size="lg">Pay Bill — App Discount</Text>
            <Text size="xs" c="dimmed" mb="lg">
              Automatic discount for diners who pay through the app, at all restaurants or only the ones you pick.
              Funded by the platform: the restaurant still gets its full payout, and
              commission is unchanged. Stacks on top of restaurant offers.
            </Text>
            <form onSubmit={appDiscountForm.onSubmit((v) => {
              if (v.appDiscountEnabled && v.appDiscountScope === 'selected' && !v.appDiscountRestaurants.length) {
                notifications.show({ title: 'Pick at least one restaurant', color: 'red' });
                return;
              }
              updateMutation.mutate(v);
            })}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>Give an app discount</Text>
                    <Text size="xs" c="dimmed">Applied automatically on Pay Bill</Text>
                  </Stack>
                  <Switch
                    checked={appDiscountForm.values.appDiscountEnabled}
                    onChange={(e) => appDiscountForm.setFieldValue('appDiscountEnabled', e.target.checked)}
                    color="green"
                  />
                </Group>

                <div>
                  <Text size="sm" fw={500} mb={6}>Restaurants</Text>
                  <SegmentedControl
                    fullWidth
                    data={[{ label: 'All restaurants', value: 'all' }, { label: 'Selected only', value: 'selected' }]}
                    value={appDiscountForm.values.appDiscountScope}
                    onChange={(v) => appDiscountForm.setFieldValue('appDiscountScope', v)}
                    disabled={!appDiscountForm.values.appDiscountEnabled}
                  />
                </div>

                {appDiscountForm.values.appDiscountScope === 'selected' && (
                  <MultiSelect
                    label="Choose restaurants"
                    description={`${appDiscountForm.values.appDiscountRestaurants.length} selected`}
                    placeholder="Search restaurants"
                    data={restaurantOptions}
                    searchable
                    clearable
                    hidePickedOptions
                    maxDropdownHeight={260}
                    nothingFoundMessage="No restaurant found"
                    disabled={!appDiscountForm.values.appDiscountEnabled}
                    {...appDiscountForm.getInputProps('appDiscountRestaurants')}
                  />
                )}

                <div>
                  <Text size="sm" fw={500} mb={6}>Discount type</Text>
                  <SegmentedControl
                    fullWidth
                    data={[{ label: 'Percent %', value: 'percent' }, { label: 'Flat ₹', value: 'flat' }]}
                    value={appDiscountForm.values.appDiscountType}
                    onChange={(v) => appDiscountForm.setFieldValue('appDiscountType', v)}
                    disabled={!appDiscountForm.values.appDiscountEnabled}
                  />
                </div>

                <NumberInput
                  label={appDiscountForm.values.appDiscountType === 'percent' ? 'Discount (% of bill)' : 'Discount amount (₹)'}
                  min={0}
                  max={appDiscountForm.values.appDiscountType === 'percent' ? 50 : 5000}
                  decimalScale={2}
                  disabled={!appDiscountForm.values.appDiscountEnabled}
                  {...appDiscountForm.getInputProps('appDiscountValue')}
                />

                {appDiscountForm.values.appDiscountType === 'percent' && (
                  <NumberInput
                    label="Max discount (₹)"
                    description="Cap per bill · 0 = no cap"
                    min={0} max={10000}
                    disabled={!appDiscountForm.values.appDiscountEnabled}
                    {...appDiscountForm.getInputProps('appDiscountCap')}
                  />
                )}

                <NumberInput
                  label="Minimum bill (₹)"
                  description="Only bills at or above this get the discount · 0 = every bill"
                  min={0} max={50000}
                  disabled={!appDiscountForm.values.appDiscountEnabled}
                  {...appDiscountForm.getInputProps('appDiscountMinBill')}
                />

                <Alert color="green" variant="light" p="sm">
                  <Text size="xs">
                    {(() => {
                      const v = appDiscountForm.values;
                      if (!v.appDiscountEnabled) return 'App discount is off.';
                      const bill = 1000;
                      let d = 0;
                      if (bill >= (v.appDiscountMinBill || 0)) {
                        d = v.appDiscountType === 'flat'
                          ? (v.appDiscountValue || 0)
                          : Math.min(bill * (v.appDiscountValue || 0) / 100, v.appDiscountCap || Infinity);
                      }
                      d = Math.min(d, bill);
                      return <>On a ₹1,000 bill the diner saves <b>₹{d.toFixed(2)}</b>; the platform pays it, the restaurant still gets its full share.</>;
                    })()}
                  </Text>
                </Alert>

                <Button type="submit" color="gold" leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateMutation.isPending}>
                  Save App Discount
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        {/* Mobile Home — hero background (Swiggy-style) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb={4} size="lg">Mobile Home — Background</Text>
            <Text size="xs" c="dimmed" mb="lg">
              Shows behind the location bar, greeting and search on the app home
              screen, under a dark overlay so text stays readable.
            </Text>
            <form onSubmit={heroForm.onSubmit((v) => updateMutation.mutate({
              ...v,
              // an image is set but the toggle is off → the intent is "on"
              homeHeroEnabled: v.homeHeroEnabled || !!(v.homeHeroImageUrl || v.homeHeroVideoUrl),
            }))}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" fw={600}>Use a background image / video</Text>
                    <Text size="xs" c="dimmed">Off = plain logo-blue background</Text>
                  </Stack>
                  <Switch
                    checked={heroForm.values.homeHeroEnabled}
                    onChange={(e) => heroForm.setFieldValue('homeHeroEnabled', e.target.checked)}
                    color="brand"
                  />
                </Group>

                <FileInput
                  label="Background image"
                  description="Wide / landscape works best · JPG, PNG or WebP, under 5 MB"
                  placeholder="Upload an image"
                  accept="image/png,image/jpeg,image/webp"
                  leftSection={<IconUpload size={16} />}
                  disabled={heroUploading}
                  onChange={uploadHeroImage}
                  value={null}
                />

                {heroForm.values.homeHeroImageUrl ? (
                  <>
                    <Image
                      src={heroForm.values.homeHeroImageUrl}
                      radius="md"
                      h={130}
                      fit="cover"
                      alt="Home background preview"
                    />
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                        URL: <a href={heroForm.values.homeHeroImageUrl} target="_blank" rel="noreferrer">
                          {heroForm.values.homeHeroImageUrl}
                        </a>
                        {' '}— this must open in the browser for the app to show it.
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={13} />}
                        onClick={() => heroForm.setFieldValue('homeHeroImageUrl', '')}
                      >
                        Remove
                      </Button>
                    </Group>
                  </>
                ) : null}

                <TextInput
                  label="…or paste an image URL"
                  placeholder="https://…"
                  {...heroForm.getInputProps('homeHeroImageUrl')}
                />

                <Divider label="Banner video (optional)" labelPosition="left" />

                <FileInput
                  label="Background video"
                  description="Plays on loop instead of the image · MP4 (H.264) best · 10–20 s, under 50 MB, no sound needed"
                  placeholder="Upload a video"
                  accept="video/mp4,video/webm,video/quicktime"
                  leftSection={<IconMovie size={16} />}
                  disabled={videoProgress !== null}
                  onChange={uploadHeroVideo}
                  value={null}
                />
                {videoProgress !== null ? (
                  <Stack gap={4}>
                    <Progress value={videoProgress} animated striped color="gold" />
                    <Text size="xs" c="dimmed">Uploading… {videoProgress}%</Text>
                  </Stack>
                ) : null}

                {heroForm.values.homeHeroVideoUrl ? (
                  <Stack gap={6}>
                    <video
                      key={heroForm.values.homeHeroVideoUrl}
                      src={heroForm.values.homeHeroVideoUrl}
                      poster={heroForm.values.homeHeroImageUrl || undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, background: '#0c2f4e' }}
                    />
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                        {heroForm.values.homeHeroVideoUrl}
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={13} />}
                        onClick={() => heroForm.setFieldValue('homeHeroVideoUrl', '')}
                      >
                        Remove
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {heroForm.values.homeHeroImageUrl
                        ? 'The image above is used as the poster while the video loads.'
                        : 'No image set — the app shows only this video.'}
                    </Text>
                  </Stack>
                ) : null}

                <TextInput
                  label="…or paste a video URL"
                  placeholder="https://…/hero.mp4"
                  {...heroForm.getInputProps('homeHeroVideoUrl')}
                />

                <Button type="submit" color="gold" leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateMutation.isPending || heroUploading || videoProgress !== null}>
                  Save Background
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        {/* Landing page (hungora.com) — hero banner image */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb={4} size="lg">Landing Page Image</Text>
            <Text size="xs" c="dimmed" mb="lg">
              The full-width banner behind the headline on the hungora.com home page.
              Leave empty to use the default banner.
            </Text>
            <form onSubmit={landingForm.onSubmit((v) => updateMutation.mutate(v))}>
              <Stack gap="md">
                <FileInput
                  label="Landing page image"
                  description="Wide / landscape (≈ 1920×1080), subject on the right · JPG, PNG or WebP, under 5 MB"
                  placeholder="Upload an image"
                  accept="image/png,image/jpeg,image/webp"
                  leftSection={<IconUpload size={16} />}
                  disabled={landingUploading}
                  onChange={uploadLandingImage}
                  value={null}
                />

                {landingForm.values.landingHeroImageUrl ? (
                  <>
                    <Image
                      src={landingForm.values.landingHeroImageUrl}
                      radius="md"
                      h={160}
                      fit="cover"
                      alt="Landing page image preview"
                    />
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                        URL: <a href={landingForm.values.landingHeroImageUrl} target="_blank" rel="noreferrer">
                          {landingForm.values.landingHeroImageUrl}
                        </a>
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={13} />}
                        onClick={() => landingForm.setFieldValue('landingHeroImageUrl', '')}
                      >
                        Reset to default
                      </Button>
                    </Group>
                  </>
                ) : (
                  <Text size="xs" c="dimmed">Using the default banner.</Text>
                )}

                <TextInput
                  label="…or paste an image URL"
                  placeholder="https://…"
                  {...landingForm.getInputProps('landingHeroImageUrl')}
                />

                <Button type="submit" color="gold" leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateMutation.isPending || landingUploading}>
                  Save Landing Image
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
