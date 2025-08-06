import { useEffect, useMemo, useRef, useState } from 'react';
import { UpdateController } from '../services/update/controller';
import { initializeStorage } from '../services/update/versionStorage';

// Configuration shape for consumers
export type UpdateNotifyOptions = {
  appVersion: string;
  changelogUrl?: string; // default '/CHANGELOG.md'
  checkOnIntervalMs?: number; // e.g., 60 * 60 * 1000 for hourly
  minorMajorOnly?: boolean; // default true per requirements
  allowPrereleaseIfFromPrerelease?: boolean; // default true per requirements
};

export function useUpdateNotifications(opts: UpdateNotifyOptions) {
  const {
    appVersion,
    changelogUrl = '/CHANGELOG.md',
    checkOnIntervalMs = 0,
    minorMajorOnly = true,
    allowPrereleaseIfFromPrerelease = true,
  } = opts;

  // DEBUG: Log the options being passed to the controller
  console.log('DEBUG: useUpdateNotifications options:', opts);

  const [isOpen, setIsOpen] = useState(false);
  const [html, setHtml] = useState<string>('');
  const [versions, setVersions] = useState<string[]>([]);
  const controllerRef = useRef<UpdateController | null>(null);

  useEffect(() => {
    initializeStorage();

    const controller = new UpdateController({
      appVersion,
      changelogUrl,
      checkOnIntervalMs,
      minorMajorOnly,
      allowPrereleaseIfFromPrerelease,
      onShow: ({ html: content, versions: vs }) => {
        setHtml(content);
        setVersions(vs);
        setIsOpen(true);
      },
      onHide: () => {
        setIsOpen(false);
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('[UpdateController] Error:', err);
      },
    });
    controllerRef.current = controller;

    controller.init();

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [appVersion, changelogUrl, checkOnIntervalMs, minorMajorOnly, allowPrereleaseIfFromPrerelease]);

  const actions = useMemo(() => {
    return {
      close: () => setIsOpen(false),
      acknowledge: async () => {
        await controllerRef.current?.markCurrentSeen();
      },
    };
  }, []);

  return {
    isOpen,
    html,
    versions,
    ...actions,
  };
}