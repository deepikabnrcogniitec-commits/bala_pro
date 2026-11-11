import { useState, useEffect } from 'react';
import {
  Stack, Title, Group, Button, Card, Text, Badge, ActionIcon, Select,
  Accordion, Modal, TextInput, Textarea, NumberInput, Switch, Box,
  SimpleGrid, Image, Grid, Skeleton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import {
  IconPlus, IconEdit, IconTrash, IconPhoto, IconLeaf, IconFlame,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { menuApi, restaurantApi } from '../../api';

function ItemModal({ opened, onClose, item, categoryId, restaurantId }) {
  const qc = useQueryClient();
  const [imageFile, setImageFile] = useState(null);
  const isEdit = !!item?._id;

  const form = useForm({
    initialValues: {
      name: item?.name || '', description: item?.description || '',
      price: item?.price || 0, isVeg: item?.isVeg ?? true,
      isAvailable: item?.isAvailable ?? true,
      calories: item?.calories || '', preparationTime: item?.preparationTime || 15,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : 'Name required'),
      price: (v) => (v > 0 ? null : 'Price must be > 0'),
    },
  });

  const mutation = useMutation({
    mutationFn: (fd) => isEdit
      ? menuApi.updateItem(restaurantId, categoryId, item._id, fd)
      : menuApi.addItem(restaurantId, categoryId, fd),
    onSuccess: () => {
      notifications.show({ title: isEdit ? 'Item updated' : 'Item added', color: 'green' });
      qc.invalidateQueries({ queryKey: ['menu', restaurantId] });
      onClose();
    },
    onError: (err) => notifications.show({ title: 'Error', message: err.response?.data?.message, color: 'red' }),
  });

  const handleSubmit = (values) => {
    const fd = new FormData();
    // null/NaN would be stringified as 'null'/'NaN'; a blank field ('') is
    // fine — the API treats it as "no value" (lets calories be cleared).
    Object.entries(values).forEach(([k, v]) => {
      if (v === null || v === undefined || Number.isNaN(v)) return;
      fd.append(k, v);
    });
    if (imageFile) fd.append('image', imageFile);
    mutation.mutate(fd);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit Item' : 'Add Menu Item'} size="lg" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gutter="md">
            <Grid.Col span={8}>
              <TextInput label="Item Name" placeholder="e.g. Paneer Tikka" required {...form.getInputProps('name')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Price (₹)" min={0} required {...form.getInputProps('price')} />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea label="Description" placeholder="Brief description..." rows={2} {...form.getInputProps('description')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Calories" placeholder="e.g. 320" {...form.getInputProps('calories')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput label="Prep Time (mins)" min={1} {...form.getInputProps('preparationTime')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Stack gap={8} pt={24}>
                <Switch label="Veg" checked={form.values.isVeg} onChange={(e) => form.setFieldValue('isVeg', e.target.checked)} color="green" />
                <Switch label="Available" checked={form.values.isAvailable} onChange={(e) => form.setFieldValue('isAvailable', e.target.checked)} color="brand" />
              </Stack>
            </Grid.Col>
          </Grid>

          <Box>
            <Text size="sm" fw={600} mb={8}>Item Image</Text>
            <Dropzone accept={IMAGE_MIME_TYPE} maxFiles={1} onDrop={(files) => setImageFile(files[0])}
              style={{ border: '2px dashed #dee2e6', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <Group gap={8} justify="center">
                <IconPhoto size={20} color="#868e96" />
                <Text size="sm" c="dimmed">{imageFile ? imageFile.name : 'Drop image here'}</Text>
              </Group>
            </Dropzone>
          </Box>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="brand" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function CategoryModal({ opened, onClose, restaurantId }) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: { name: (v) => (v.trim().length >= 2 ? null : 'Category name required') },
  });

  const mutation = useMutation({
    mutationFn: (data) => menuApi.addCategory(restaurantId, data),
    onSuccess: () => {
      notifications.show({ title: 'Category added', color: 'green' });
      qc.invalidateQueries({ queryKey: ['menu', restaurantId] });
      onClose();
      form.reset();
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Add Category" centered size="sm">
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="md">
          <TextInput label="Category Name" placeholder="e.g. Starters, Main Course" required {...form.getInputProps('name')} />
          <TextInput label="Description" placeholder="Optional description" {...form.getInputProps('description')} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="brand" loading={mutation.isPending}>Add Category</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function MenuPage() {
  const qc = useQueryClient();
  const [restaurantId, setRestaurantId] = useState('');
  const [catModal, setCatModal] = useState(false);
  const [itemModal, setItemModal] = useState({ open: false, item: null, categoryId: null });

  const { data: restaurants } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => restaurantApi.getMyRestaurants().then((r) => r.data.data.restaurants),
  });

  useEffect(() => {
    if (restaurants?.[0] && !restaurantId) setRestaurantId(restaurants[0]._id);
  }, [restaurants]);

  const { data: menu, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => menuApi.get(restaurantId).then((r) => r.data.data.menu),
    enabled: !!restaurantId,
  });

  const deleteCatMutation = useMutation({
    mutationFn: (catId) => menuApi.deleteCategory(restaurantId, catId),
    onSuccess: () => {
      notifications.show({ title: 'Category deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['menu', restaurantId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ catId, itemId }) => menuApi.deleteItem(restaurantId, catId, itemId),
    onSuccess: () => {
      notifications.show({ title: 'Item deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['menu', restaurantId] });
    },
  });

  const restaurantOptions = restaurants?.map((r) => ({ value: r._id, label: r.name })) || [];
  const categories = menu?.categories || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Menu Management</Title>
        <Group gap="sm">
          {restaurants?.length > 1 && (
            <Select data={restaurantOptions} value={restaurantId} onChange={setRestaurantId}
              placeholder="Select Restaurant" style={{ width: 200 }} />
          )}
          <Button leftSection={<IconPlus size={16} />} variant="light" color="brand"
            onClick={() => setCatModal(true)} disabled={!restaurantId}>
            Add Category
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Stack gap="sm">{[1,2].map((i) => <Skeleton key={i} height={120} radius="md" />)}</Stack>
      ) : (
        <Accordion variant="separated" radius="md">
          {categories.map((cat) => (
            <Accordion.Item key={cat._id} value={cat._id}>
              <Accordion.Control>
                <Group justify="space-between" style={{ paddingRight: 8 }}>
                  <Group gap="sm">
                    <Text fw={700}>{cat.name}</Text>
                    <Badge size="sm" variant="light">{cat.items?.length || 0} items</Badge>
                  </Group>
                  <Group gap={4} onClick={(e) => e.stopPropagation()}>
                    <ActionIcon size="sm" color="brand" variant="light"
                      onClick={() => setItemModal({ open: true, item: null, categoryId: cat._id })}>
                      <IconPlus size={13} />
                    </ActionIcon>
                    <ActionIcon size="sm" color="red" variant="light"
                      onClick={() => deleteCatMutation.mutate(cat._id)}>
                      <IconTrash size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {cat.items?.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="md">No items yet. Click + to add.</Text>
                  )}
                  {cat.items?.map((item) => (
                    <Card key={item._id} withBorder radius="sm" p="sm">
                      <Group justify="space-between">
                        <Group gap="md" style={{ flex: 1 }}>
                          {item.image?.url ? (
                            <Image src={item.image.url} w={56} h={56} radius="sm" />
                          ) : (
                            <Box w={56} h={56} style={{ background: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconPhoto size={20} color="#ced4da" />
                            </Box>
                          )}
                          <Stack gap={3} style={{ flex: 1 }}>
                            <Group gap={6}>
                              <Text size="sm" fw={700}>{item.name}</Text>
                              {item.isVeg ? (
                                <Badge size="xs" color="green" variant="dot">Veg</Badge>
                              ) : (
                                <Badge size="xs" color="red" variant="dot">Non-Veg</Badge>
                              )}
                              {!item.isAvailable && (
                                <Badge size="xs" color="gray" variant="light">Unavailable</Badge>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={1}>{item.description}</Text>
                            <Group gap="sm">
                              <Text size="sm" fw={700} c="brand">₹{item.price}</Text>
                              {item.calories && (
                                <Group gap={3}>
                                  <IconFlame size={12} color="#f4a261" />
                                  <Text size="xs" c="dimmed">{item.calories} cal</Text>
                                </Group>
                              )}
                            </Group>
                          </Stack>
                        </Group>
                        <Group gap={4}>
                          <ActionIcon size="sm" variant="subtle"
                            onClick={() => setItemModal({ open: true, item, categoryId: cat._id })}>
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon size="sm" color="red" variant="subtle"
                            onClick={() => deleteItemMutation.mutate({ catId: cat._id, itemId: item._id })}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <CategoryModal opened={catModal} onClose={() => setCatModal(false)} restaurantId={restaurantId} />
      <ItemModal
        opened={itemModal.open}
        onClose={() => setItemModal({ open: false, item: null, categoryId: null })}
        item={itemModal.item}
        categoryId={itemModal.categoryId}
        restaurantId={restaurantId}
      />
    </Stack>
  );
}
