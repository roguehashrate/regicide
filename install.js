let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing
  e.preventDefault();
  // Save the event to trigger later
  deferredPrompt = e;

  // Show the install button
  const installBtn = document.getElementById('install-btn');
  installBtn.style.display = 'block';
});

document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;

  // Show the prompt
  deferredPrompt.prompt();

  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install: ${outcome}`);

  // Clear the saved event
  deferredPrompt = null;
  // Optionally hide the button
  document.getElementById('install-btn').style.display = 'none';
});
