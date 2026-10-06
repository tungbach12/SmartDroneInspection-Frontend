import { AxiosError } from 'axios';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetDocument } from '../api/documentApi';

function problemError(status: number, detail: string, code: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { type: 'about:blank', title: 'Error', status, detail, code },
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

const storedDocument: AssetDocument = {
  id: 'd1',
  documentType: 'OWNERSHIP',
  fileName: 'deed.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
  checksumSha256: 'abc123',
  documentDate: null,
  createdAt: '2026-09-25T00:00:00Z',
};

let documents: AssetDocument[] | undefined = [storedDocument];
let documentsState: { isLoading: boolean; error: unknown } = { isLoading: false, error: null };
let uploadState: { isError: boolean; error: unknown } = { isError: false, error: null };

const { content, upload } = vi.hoisted(() => ({
  content: vi.fn(),
  upload: vi.fn(),
}));
content.mockResolvedValue(new Blob(['pdf']));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: ['CLIENT'] }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../api/documentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/documentApi')>();
  return {
    ...actual,
    documentApi: {
      ...actual.documentApi,
      content: content,
      upload: (...args: unknown[]) => upload(...args),
    },
  };
});

vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({
    data: documents,
    isLoading: documentsState.isLoading,
    error: documentsState.error,
  }),
  useUploadDocument: () => ({
    mutate: upload,
    isPending: false,
    isError: uploadState.isError,
    error: uploadState.error,
  }),
}));

vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'a1',
          code: 'BR-1',
          name: 'North bridge',
          description: null,
          locationText: 'District 1',
          latitude: null,
          longitude: null,
          status: 'ACTIVE',
          categoryId: 'c1',
          createdAt: '2026-09-25T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
}));

import { AssetsPage } from './AssetsPage';

describe('AssetsPage document streaming contract', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    documents = [storedDocument];
    documentsState = { isLoading: false, error: null };
    uploadState = { isError: false, error: null };
  });

  it('streams document content through the authenticated client instead of a bare href', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:document-1');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    try {
      render(<AssetsPage />);
      (await screen.findByText('North bridge')).click();
      const open = await screen.findByRole('button', { name: /Open/ });
      open.click();

      await waitFor(() => expect(content).toHaveBeenCalledWith('a1', 'd1'));
      await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('does not render an unauthenticated content href for a document', async () => {
    render(<AssetsPage />);
    (await screen.findByText('North bridge')).click();

    const open = await screen.findByRole('button', { name: /Open/ });
    expect(open.tagName).toBe('BUTTON');
    expect(open.getAttribute('href')).toBeNull();
  });

  it('explains a denial of document access as a permissions outcome', async () => {
    documentsState = {
      isLoading: false,
      error: problemError(403, 'No organization scope', 'FORBIDDEN'),
    };

    render(<AssetsPage />);
    (await screen.findByText('North bridge')).click();

    const alert = await screen.findByTestId('document-access-denied');
    expect(alert.textContent).toContain('Permission required');
  });

  it('keeps upload usable when listing documents was denied', async () => {
    // Upload is authorized separately from list/open, so a caller denied the listing still needs the
    // form. The refusal covers the list only, and the upload must actually reach the mutation.
    documentsState = {
      isLoading: false,
      error: problemError(403, 'No organization scope', 'FORBIDDEN'),
    };

    render(<AssetsPage />);
    (await screen.findByText('North bridge')).click();
    await screen.findByTestId('document-access-denied');

    const file = new File(['bytes'], 'deed.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /Upload document/ });
    expect((uploadButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(uploadButton);

    await waitFor(() =>
      expect(upload).toHaveBeenCalledWith(
        expect.objectContaining({ file, documentType: 'OWNERSHIP' }),
        expect.anything(),
      ),
    );
  });
  it('revokes the object URL after the download starts, and does not leave it pending', async () => {
    // The revoke is deferred so the browser can begin the transfer. The URL must still be revoked
    // once that delay elapses, and the pending flag released, or the blob URL leaks. The 1000ms
    // delay is fired by hand so the assertion cannot race a slow machine.
    const revokeObjectURL = vi.fn();
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:document-1');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    try {
      render(<AssetsPage />);
      (await screen.findByText('North bridge')).click();
      const open = await screen.findByRole('button', { name: /Open/ });
      open.click();

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      // still deferred: the download has started but the browser needs its window
      expect(revokeObjectURL).not.toHaveBeenCalled();

      // Headroom beyond the 1000ms deferral: this suite runs in parallel with many others, so a
      // tight bound here would make the assertion a race against machine load.
      await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:document-1'), {
        timeout: 15_000,
      });
      // the button is usable again, so the drawer is not stuck on a finished download
      expect((open as HTMLButtonElement).disabled).toBe(false);
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });
  it('revokes the object URL immediately when the drawer unmounts before the deferral elapses', async () => {
    // The revoke is deferred a second so the browser can start the transfer. If the drawer is torn
    // down in that window the pending timer is cleared and the URL revoked now, rather than being
    // left to fire into a component that no longer exists.
    const revokeObjectURL = vi.fn();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:leaked');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    try {
      const { unmount } = render(<AssetsPage />);
      (await screen.findByText('North bridge')).click();
      const open = await screen.findByRole('button', { name: /Open/ });
      open.click();

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      // still deferred at this point; the URL is live but scheduled for revocation
      expect(revokeObjectURL).not.toHaveBeenCalled();

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:leaked');
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });
  it('does not hand bytes to the browser when the download resolves after the drawer closed', async () => {
    // The fetch can outlive the drawer. Resolving late must not create an object URL or fire a
    // download for a panel the user has already dismissed.
    let settle: ((blob: Blob) => void) | undefined;
    content.mockReturnValueOnce(
      new Promise<Blob>((resolve) => {
        settle = resolve;
      }),
    );
    const createObjectURL = vi.fn().mockReturnValue('blob:late');
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = createObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    try {
      const { unmount } = render(<AssetsPage />);
      (await screen.findByText('North bridge')).click();
      const open = await screen.findByRole('button', { name: /Open/ });
      open.click();
      await waitFor(() => expect(content).toHaveBeenCalled());

      unmount();
      settle?.(new Blob(['pdf']));
      await waitFor(() => expect(content).toHaveBeenCalled());

      expect(createObjectURL).not.toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });
});
