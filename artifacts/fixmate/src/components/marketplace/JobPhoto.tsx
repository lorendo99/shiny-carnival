import { useEffect, useState, useMemo } from 'react';
import { useReadJobPhoto } from '@workspace/api-client-react';
import { Image as ImageIcon, LoaderCircle } from 'lucide-react';

export function JobPhoto({ jobId, index }: { jobId: string; index: number }) {
  const { data, isPending, isError } = useReadJobPhoto(jobId, index, {
    request: { responseType: 'blob', credentials: 'include' },
  });

  const url = useMemo(() => {
    if ((data as any) instanceof Blob) {
      return URL.createObjectURL(data as any);
    }
    return undefined;
  }, [data]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (isPending) {
    return (
      <div className="job-photo-placeholder">
        <LoaderCircle className="animate-spin" size={24} />
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="job-photo-placeholder error">
        <ImageIcon size={24} />
      </div>
    );
  }

  return <img src={url} alt={`Job photo ${index + 1}`} className="job-photo" loading="lazy" />;
}
