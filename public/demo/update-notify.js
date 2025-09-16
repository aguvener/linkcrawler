import { UpdateController } from '../../src/services/update/controller.ts';

// Lightweight vanilla modal using the controller's HTML output
function createModal({ html, onAcknowledge, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'update-modal-overlay';
  overlay.addEventListener('click', () => {
    onClose();
    document.body.removeChild(overlay);
  });

  const modal = document.createElement('div');
  modal.className = 'update-modal';
  modal.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('header');
  const h2 = document.createElement('h2');
  h2.textContent = 'What’s New';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.className = 'secondary';
  closeBtn.addEventListener('click', () => {
    onClose();
    document.body.removeChild(overlay);
  });
  header.appendChild(h2);
  header.appendChild(closeBtn);

  const main = document.createElement('main');
  const container = document.createElement('div');
  container.innerHTML = html;
  main.appendChild(container);

  const footer = document.createElement('footer');
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.className = 'secondary';
  close.addEventListener('click', () => {
    onClose();
    document.body.removeChild(overlay);
  });
  const ok = document.createElement('button');
  ok.textContent = 'Got it';
  ok.addEventListener('click', async () => {
    await onAcknowledge();
    onClose();
    document.body.removeChild(overlay);
  });
  footer.appendChild(close);
  footer.appendChild(ok);

  modal.appendChild(header);
  modal.appendChild(main);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function mount() {
  const $ = (id) => document.getElementById(id);

  const startBtn = $('start');
  const resetBtn = $('reset');

  let controller = null;

  startBtn.addEventListener('click', () => {
    const appVersion = $('version').value.trim() || '1.4.0';
    const interval = Number($('interval').value || '0');
    const minorMajorOnly = $('minorMajorOnly').value === 'true';
    const allowPrerelease = $('allowPrerelease').value === 'true';

    if (controller) {
      controller.dispose();
      controller = null;
    }

    controller = new UpdateController({
      appVersion,
      changelogUrl: '/CHANGELOG.md',
      checkOnIntervalMs: interval,
      minorMajorOnly,
      allowPrereleaseIfFromPrerelease: allowPrerelease,
      onShow: ({ html }) => {
        createModal({
          html,
          onAcknowledge: () => controller.markCurrentSeen(),
          onClose: () => {},
        });
      },
      onHide: () => {
        // No-op in vanilla demo, modal closes via overlay/close logic
      },
      onError: (e) => {
        // eslint-disable-next-line no-console
        console.error('[UpdateController] error:', e);
        alert('Error initializing update controller. See console.');
      },
    });

    controller.init();
  });

  resetBtn.addEventListener('click', () => {
    localStorage.clear();
    alert('Local storage cleared for demo.');
  });
}

document.addEventListener('DOMContentLoaded', mount);