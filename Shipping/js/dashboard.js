document.addEventListener('DOMContentLoaded', () => {
    AOS.init({ duration: 600, once: true, offset: 50, delay: 100 });

    const body = document.body;
    const sidebar = document.getElementById('dashboard-sidebar');
    const mobileHamburger = document.getElementById('mobile-hamburger');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const mobileHeaderTitle = document.querySelector('.mobile-header-title');
    const navTriggers = document.querySelectorAll('#sidebar-nav a, .nav-action-trigger');
    const contentPanels = document.querySelectorAll('.content-panel');
    const copyBtn = document.getElementById('copy-address-btn');
    const addressTextContainer = document.getElementById('address-to-copy');
    const depositModalOverlay = document.getElementById('deposit-modal-overlay');
    const openModalBtn = document.getElementById('open-deposit-modal');
    const closeModalBtn = document.getElementById('modal-close');
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    function openSidebar() { body.classList.add('sidebar-open'); }
    function closeSidebar() { body.classList.remove('sidebar-open'); }
    function openModal() { if (depositModalOverlay) depositModalOverlay.classList.add('active'); }
    function closeModal() { if (depositModalOverlay) depositModalOverlay.classList.remove('active'); }

    if (mobileHamburger) mobileHamburger.addEventListener('click', openSidebar);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeSidebar);

    navTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-target');
            if (!targetId) { if(trigger.href) window.location.href = trigger.href; return; }
            document.querySelectorAll('#sidebar-nav a').forEach(l => l.classList.remove('active'));
            const correspondingSidebarLink = document.querySelector(`#sidebar-nav a[data-target="${targetId}"]`);
            if (correspondingSidebarLink) {
                correspondingSidebarLink.classList.add('active');
                if (mobileHeaderTitle) mobileHeaderTitle.textContent = correspondingSidebarLink.querySelector('span').textContent;
            }
            contentPanels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                // Re-trigger AOS for the new panel
                AOS.refreshHard();
            }
            closeSidebar();
        });
    });

    if (copyBtn && addressTextContainer) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(addressTextContainer.innerText).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => { copyBtn.innerHTML = originalText; copyBtn.classList.remove('copied'); }, 2000);
            });
        });
    }

    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (depositModalOverlay) depositModalOverlay.addEventListener('click', (e) => { if (e.target === depositModalOverlay) closeModal(); });
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    if(deleteAccountBtn){
        deleteAccountBtn.addEventListener('click', () => {
            const confirmation = window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
            if(confirmation){
                console.log("Account deletion initiated.");
                alert("Your account has been deleted.");
                window.location.href = "index.html";
            }
        });
    }
});