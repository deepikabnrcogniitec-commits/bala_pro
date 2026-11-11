import { useState, useEffect, useMemo } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, TextInput, Textarea, Select,
  MultiSelect, NumberInput, Switch, Divider, SimpleGrid, ActionIcon,
  Box, Grid, Paper, Image, CloseButton, rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { TimeInput } from '@mantine/dates';
import { IconArrowLeft, IconUpload, IconPhoto, IconX, IconPlus, IconTrash } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { restaurantApi } from '../../api';

const CUISINES = ['North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental', 'Mexican', 'Japanese', 'Thai', 'Mughlai', 'Bengali', 'Rajasthani', 'Gujarati', 'Kerala', 'Seafood', 'Biryani', 'Pizza', 'Burger', 'Fast Food', 'Cafe'];
const FACILITIES = ['AC', 'Parking', 'WiFi', 'Live Music', 'Rooftop', 'Outdoor Seating', 'Private Dining', 'Takeaway', 'Delivery', 'Bar', 'Hookah', 'Pet Friendly', 'Kids Zone'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultHours = DAYS.reduce((acc, d) => {
  acc[d] = { isOpen: d !== 'sunday', openTime: '11:00', closeTime: '23:00' };
  return acc;
}, {});

export default function RestaurantFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const [logoFile, setLogoFile] = useState(null);
  const [coverFiles, setCoverFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // edit mode: current cover photos kept
  const [existingLogo, setExistingLogo] = useState(null);
  const [operatingHours, setOperatingHours] = useState(defaultHours);

  const form = useForm({
    initialValues: {
      name: '', description: '', cuisine: [], facilities: [],
      priceRange: 2, city: '', address: '', phone: '', email: '',
      website: '', minBookingGuests: 1, maxBookingGuests: 20,
      maxAdvanceBookingDays: 30, bookingDuration: 120,
      latitude: '', longitude: '',
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : 'Name must be at least 2 characters'),
      cuisine: (v) => (v.length > 0 ? null : 'Select at least one cuisine'),
      city: (v) => (v.trim() ? null : 'City is required'),
      phone: (v) => (/^\+?[0-9]{10,13}$/.test(v.replace(/\s/g, '')) ? null : 'Valid phone required'),
    },
  });

  const { data: existing } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantApi.getById(id).then((r) => r.data.data.restaurant),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    form.setValues({
      name: existing.name || '',
      description: existing.description || '',
      cuisine: existing.cuisine || [],
      facilities: existing.amenities || [],
      priceRange: existing.priceRange || 2,
      city: existing.address?.city || '',
      address: existing.address?.street || '',
      phone: existing.contact?.phone || '',
      email: existing.contact?.email || '',
      website: existing.contact?.website || '',
      minBookingGuests: existing.bookingSettings?.minGuests || 1,
      maxBookingGuests: existing.bookingSettings?.maxGuestsPerBooking || 20,
      maxAdvanceBookingDays: existing.bookingSettings?.advanceBookingDays || 30,
      bookingDuration: 120,
      latitude: existing.location?.coordinates?.[1]?.toString() || '',
      longitude: existing.location?.coordinates?.[0]?.toString() || '',
    });
    setExistingImages(existing.images || []);
    setExistingLogo(existing.logo?.url ? existing.logo : null);
    if (existing.operatingHours?.length) {
      const hoursMap = existing.operatingHours.reduce((acc, h) => {
        acc[h.day] = { isOpen: h.isOpen, openTime: h.slots?.[0]?.open || '11:00', closeTime: h.slots?.[0]?.close || '23:00' };
        return acc;
      }, {});
      setOperatingHours((prev) => ({ ...prev, ...hoursMap }));
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (fd) => restaurantApi.create(fd),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant created!', color: 'green' });
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      navigate('/restaurants');
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const updateMutation = useMutation({
    mutationFn: (fd) => restaurantApi.update(id, fd),
    onSuccess: () => {
      notifications.show({ title: 'Restaurant updated!', color: 'green' });
      qc.invalidateQueries({ queryKey: ['my-restaurants'] });
      navigate('/restaurants');
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const handleSubmit = (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
      else fd.append(k, v);
    });
    fd.append('operatingHours', JSON.stringify(operatingHours));
    if (logoFile) fd.append('logo', logoFile);
    coverFiles.forEach((f) => fd.append('images', f));
    if (isEdit) {
      fd.append('existingImages', JSON.stringify(existingImages.map((img) => img.url)));
      if (!existingLogo && !logoFile && existing?.logo?.url) fd.append('removeLogo', 'true');
    }

    if (isEdit) updateMutation.mutate(fd);
    else createMutation.mutate(fd);
  };

  const toggleDay = (day) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen },
    }));
  };

  const updateHour = (day, field, val) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: val },
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const maxNewCovers = Math.max(0, 10 - existingImages.length);

  // Object URLs for previewing not-yet-uploaded files
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  const coverPreviews = useMemo(() => coverFiles.map((f) => URL.createObjectURL(f)), [coverFiles]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  useEffect(() => () => coverPreviews.forEach((u) => URL.revokeObjectURL(u)), [coverPreviews]);

  return (
    <Stack gap="lg">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/restaurants')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Title order={2}>{isEdit ? 'Edit Restaurant' : 'Add New Restaurant'}</Title>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Basic Info */}
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="md" tt="uppercase" size="sm" c="dimmed">Basic Information</Text>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label="Restaurant Name" placeholder="e.g. Spice Garden" required {...form.getInputProps('name')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <MultiSelect label="Cuisines" placeholder="Select cuisines" data={CUISINES} required searchable {...form.getInputProps('cuisine')} />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea label="Description" placeholder="Tell customers about your restaurant..." rows={3} {...form.getInputProps('description')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select label="Price Range" data={[
                  { value: '1', label: '₹ Budget' },
                  { value: '2', label: '₹₹ Moderate' },
                  { value: '3', label: '₹₹₹ Fine Dining' },
                  { value: '4', label: '₹₹₹₹ Luxury' },
                ]} value={String(form.values.priceRange)} onChange={(v) => form.setFieldValue('priceRange', Number(v))} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput label="City" placeholder="Bangalore" required {...form.getInputProps('city')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput label="Phone" placeholder="+91 98765 43210" required {...form.getInputProps('phone')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label="Address" placeholder="Street address" {...form.getInputProps('address')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label="Email" placeholder="restaurant@email.com" {...form.getInputProps('email')} />
              </Grid.Col>
              <Grid.Col span={12}>
                <MultiSelect label="Facilities" placeholder="Select facilities" data={FACILITIES} searchable {...form.getInputProps('facilities')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label="Latitude" placeholder="e.g. 12.9716 (for map location)" {...form.getInputProps('latitude')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label="Longitude" placeholder="e.g. 77.5946 (for map location)" {...form.getInputProps('longitude')} />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Images */}
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="md" tt="uppercase" size="sm" c="dimmed">Images</Text>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" fw={600} mb={8}>Logo</Text>
                {logoPreview || existingLogo ? (
                  <Box pos="relative" w={140}>
                    <Image src={logoPreview || existingLogo.url} w={140} h={140} radius="md" fit="cover" />
                    <CloseButton size="sm" variant="filled" color="red" radius="xl"
                      style={{ position: 'absolute', top: 6, right: 6 }}
                      onClick={() => { if (logoFile) setLogoFile(null); else setExistingLogo(null); }} />
                  </Box>
                ) : (
                  <Dropzone accept={IMAGE_MIME_TYPE} maxFiles={1} maxSize={5 * 1024 ** 2}
                    onDrop={(files) => setLogoFile(files[0])}
                    onReject={() => notifications.show({ title: 'Logo rejected', message: 'Use a JPG/PNG/WEBP under 5 MB', color: 'red' })}
                    style={{ border: '2px dashed #dee2e6', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                    <Stack align="center" gap={8}>
                      <IconPhoto size={28} color="#868e96" />
                      <Text size="sm" c="dimmed">Drop logo here or click</Text>
                    </Stack>
                  </Dropzone>
                )}
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Text size="sm" fw={600} mb={8}>
                  Cover Photos ({existingImages.length + coverFiles.length}/10) — first photo is the main one
                </Text>
                {(existingImages.length > 0 || coverFiles.length > 0) && (
                  <SimpleGrid cols={{ base: 3, sm: 4 }} spacing={8} mb={8}>
                    {existingImages.map((img) => (
                      <Box key={img.url} pos="relative">
                        <Image src={img.url} h={90} radius="sm" fit="cover" />
                        <CloseButton size="xs" variant="filled" color="red" radius="xl"
                          style={{ position: 'absolute', top: 4, right: 4 }}
                          onClick={() => setExistingImages((prev) => prev.filter((i) => i.url !== img.url))} />
                      </Box>
                    ))}
                    {coverFiles.map((f, i) => (
                      <Box key={`new-${i}`} pos="relative">
                        <Image src={coverPreviews[i]} h={90} radius="sm" fit="cover" style={{ outline: '2px solid #40c057' }} />
                        <CloseButton size="xs" variant="filled" color="red" radius="xl"
                          style={{ position: 'absolute', top: 4, right: 4 }}
                          onClick={() => setCoverFiles((prev) => prev.filter((_, idx) => idx !== i))} />
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
                {maxNewCovers - coverFiles.length > 0 && (
                  <Dropzone accept={IMAGE_MIME_TYPE} maxSize={5 * 1024 ** 2}
                    onDrop={(files) => setCoverFiles((prev) => [...prev, ...files].slice(0, maxNewCovers))}
                    onReject={() => notifications.show({ title: 'Some photos rejected', message: 'Use JPG/PNG/WEBP under 5 MB', color: 'red' })}
                    style={{ border: '2px dashed #dee2e6', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                    <Stack align="center" gap={8}>
                      <IconUpload size={28} color="#868e96" />
                      <Text size="sm" c="dimmed">Drop cover photos here or click to add</Text>
                    </Stack>
                  </Dropzone>
                )}
              </Grid.Col>
            </Grid>
          </Card>

          {/* Operating Hours */}
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="md" tt="uppercase" size="sm" c="dimmed">Operating Hours</Text>
            <Stack gap="sm">
              {DAYS.map((day) => (
                <Group key={day} gap="md">
                  <Switch checked={operatingHours[day]?.isOpen} onChange={() => toggleDay(day)} />
                  <Text size="sm" fw={600} style={{ width: 100, textTransform: 'capitalize' }}>{day}</Text>
                  {operatingHours[day]?.isOpen ? (
                    <>
                      <TimeInput
                        value={operatingHours[day]?.openTime}
                        onChange={(e) => updateHour(day, 'openTime', e.target.value)}
                        style={{ width: 100 }}
                      />
                      <Text size="sm" c="dimmed">to</Text>
                      <TimeInput
                        value={operatingHours[day]?.closeTime}
                        onChange={(e) => updateHour(day, 'closeTime', e.target.value)}
                        style={{ width: 100 }}
                      />
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">Closed</Text>
                  )}
                </Group>
              ))}
            </Stack>
          </Card>

          {/* Booking Settings */}
          <Card withBorder radius="md" p="lg">
            <Text fw={700} mb="md" tt="uppercase" size="sm" c="dimmed">Booking Settings</Text>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 3 }}>
                <NumberInput label="Min Guests" min={1} max={20} {...form.getInputProps('minBookingGuests')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <NumberInput label="Max Guests" min={1} max={100} {...form.getInputProps('maxBookingGuests')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <NumberInput label="Max Advance Days" min={1} max={365} {...form.getInputProps('maxAdvanceBookingDays')} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <NumberInput label="Slot Duration (mins)" min={30} max={240} step={30} {...form.getInputProps('bookingDuration')} />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Submit */}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => navigate('/restaurants')}>Cancel</Button>
            <Button type="submit" color="brand" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Restaurant'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
