import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Image, Alert, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { getListRepairJobsQueryKey, useCreateRepairJob, useRequestUploadUrl, UploadedMedia } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export default function NewJob() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    diagnosisId?: string | string[];
    title?: string | string[];
    itemType?: string | string[];
    category?: string | string[];
    description?: string | string[];
  }>();

  const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
  const diagnosisId = firstParam(params.diagnosisId);
  const diagnosisTitle = firstParam(params.title);
  const diagnosisItemType = firstParam(params.itemType);
  const diagnosisCategory = firstParam(params.category);
  const diagnosisDescription = firstParam(params.description);

  const [title, setTitle] = useState(diagnosisTitle);
  const [itemType, setItemType] = useState(diagnosisItemType);
  const [category, setCategory] = useState<'appliance' | 'plumbing' | 'painting' | 'electrical'>(
    diagnosisCategory === 'plumbing' || diagnosisCategory === 'painting' || diagnosisCategory === 'electrical' ? diagnosisCategory : 'appliance',
  );
  const [description, setDescription] = useState(diagnosisDescription);
  const [postcode, setPostcode] = useState('');
  const [photos, setPhotos] = useState<{ uri: string, type: string, name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const requestUrl = useRequestUploadUrl();
  const createJob = useCreateRepairJob();

  const handlePickMedia = async () => {
    setErrorMsg('');
    if (photos.length >= 5) {
      setErrorMsg('You can upload up to 5 photos.');
      return;
    }

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'photo.jpg';
      setPhotos(prev => [...prev, { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: filename }]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (photo: { uri: string, type: string, name: string }): Promise<UploadedMedia> => {
    const response = await fetch(photo.uri);
    const blob = await response.blob();

    const req = await requestUrl.mutateAsync({ data: { name: photo.name, size: blob.size, contentType: photo.type } });

    const putResponse = await fetch(req.uploadURL, {
      method: 'PUT',
      headers: {
        'Content-Type': photo.type
      },
      body: blob
    });

    if (!putResponse.ok) {
       throw new Error('Upload failed');
    }

    return {
      objectPath: req.objectPath,
      uploadToken: req.uploadToken,
      name: photo.name,
      contentType: photo.type,
      size: blob.size
    };
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!title || !itemType || !description || !postcode) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedPhotos: UploadedMedia[] = [];
      for (const photo of photos) {
        const up = await uploadPhoto(photo);
        uploadedPhotos.push(up);
      }

      const job = await createJob.mutateAsync({
        data: {
          diagnosisId: diagnosisId || undefined,
          title,
          itemType,
          category,
          description,
          postcode,
          photoRefs: uploadedPhotos.length > 0 ? uploadedPhotos : undefined
        }
      });

      queryClient.invalidateQueries({ queryKey: getListRepairJobsQueryKey({ scope: 'mine' }) });
      router.replace(`/jobs/${job.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create job.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      bottomOffset={20}
    >
      <View style={{ marginBottom: 32, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.foreground }}>{diagnosisId ? 'Post diagnosis as a job' : 'Post a job'}</Text>
      </View>

      {diagnosisId ? (
        <View style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, borderRadius: colors.radius, padding: 14, marginBottom: 22 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 4 }}>
            Diagnosis summary included
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }}>
            Check the details, add your postcode, and post the job for local workers to accept or pass.
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', marginBottom: 16 }}>
          {errorMsg}
        </Text>
      ) : null}

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Job Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. Broken washing machine door"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Job Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {([
          ['appliance', 'Appliance'],
          ['plumbing', 'Plumbing'],
          ['painting', 'Painting'],
          ['electrical', 'Electrical'],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setCategory(value)}
            style={{
              borderWidth: 1,
              borderColor: category === value ? colors.primary : colors.border,
              backgroundColor: category === value ? colors.primary : colors.card,
              borderRadius: colors.radius,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: category === value ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_500Medium' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

       <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>What needs doing?</Text>
      <TextInput
        value={itemType}
        onChangeText={setItemType}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
         placeholder="e.g. leaking tap, wall to paint, shelf to fit"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Postcode (UK)</Text>
      <TextInput
        value={postcode}
        onChangeText={setPostcode}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
        placeholder="e.g. SW1A 1AA"
        placeholderTextColor={colors.mutedForeground}
      />
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: colors.mutedForeground, marginTop: -2, marginBottom: 16 }}>
        Workers see only the postcode area until both sides agree on a price. The full postcode is shared with the chosen worker afterward.
      </Text>

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={[styles.input, { minHeight: 100, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
         placeholder="Describe the outcome you need, access details, and anything a worker should know..."
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground, marginBottom: 8 }}>Photos ({photos.length}/5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
        {photos.map((photo, idx) => (
          <View key={idx} style={{ marginRight: 12, position: 'relative' }}>
            <Image source={{ uri: photo.uri }} style={{ width: 100, height: 100, borderRadius: colors.radius }} />
            <Pressable
              onPress={() => removePhoto(idx)}
              style={{ position: 'absolute', top: -8, right: -8, backgroundColor: colors.destructive, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="x" size={14} color={colors.destructiveForeground} />
            </Pressable>
          </View>
        ))}
        {photos.length < 5 && (
          <Pressable
            onPress={handlePickMedia}
            style={{ width: 100, height: 100, borderRadius: colors.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="camera" size={24} color={colors.primary} />
          </Pressable>
        )}
      </ScrollView>

      <Pressable
        onPress={handleSubmit}
        disabled={isUploading || createJob.isPending || !title || !itemType || !description || !postcode}
        style={({ pressed }) => [{ backgroundColor: (isUploading || createJob.isPending || !title || !itemType || !description || !postcode) ? colors.muted : colors.foreground, padding: 18, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 }]}
      >
        {isUploading || createJob.isPending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: (!title || !itemType || !description || !postcode) ? colors.mutedForeground : colors.background }}>{diagnosisId ? 'Post job & get offers' : 'Post job'}</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular'
  }
});
