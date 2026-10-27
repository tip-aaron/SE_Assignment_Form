document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('patient-form');

    if (!form) return;

    // Storage Keys
    const STORAGE_KEY_DATA = 'patient_form_draft_data';
    const STORAGE_KEY_STEP = 'patient_form_draft_step';

    const steps = Array.from(form.querySelectorAll('.form-step'));
    const stepIndicators = Array.from(document.querySelectorAll('.step-item'));
    let currentStep = 0;

    // Helper: Locate error <small> element by DOM structure or aria-describedby
    function getErrorElement(input) {
        const parentField = input.closest('.field');
        if (parentField) {
            const errorEl = parentField.querySelector('.field-error');
            if (errorEl) return errorEl;
        }

        const describedBy = input.getAttribute('aria-describedby') || '';
        const ids = describedBy.split(' ');
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('field-error')) {
                return el;
            }
        }
        return null;
    }

    // Display error using Native Validity API message
    function showFieldError(input) {
        const errorEl = getErrorElement(input);
        if (errorEl) {
            errorEl.textContent = input.validationMessage;
        }
        input.setAttribute('aria-invalid', 'true');
    }

    // Clear field error
    function clearFieldError(input) {
        const errorEl = getErrorElement(input);
        if (errorEl) {
            errorEl.textContent = '';
        }
        input.removeAttribute('aria-invalid');
    }

    // --- CUSTOM ADDRESS VALIDATOR ---
    function validateAddressInput(addressInput) {
        if (!addressInput) return;
        const val = addressInput.value.trim();

        if (val.length === 0) {
            addressInput.setCustomValidity('Please enter complete home address.');
        } else if (val.length < 10) {
            addressInput.setCustomValidity('Address is too short. Please include house no., street, barangay, city, and province.');
        } else if (!/[a-zA-Z]/.test(val)) {
            addressInput.setCustomValidity('Address must contain readable street or location names.');
        } else if (/^(.)\1+$/.test(val)) {
            addressInput.setCustomValidity('Please enter a valid street address, not repeated characters.');
        } else {
            addressInput.setCustomValidity(''); // Clear custom error
        }
    }

    // --- CONDITIONAL FIELD VISIBILITY LOGIC ---
    function updateConditionalFields() {
        // 1. Company Name: Show only if "Company" radio is selected
        const companyGroup = document.getElementById('company-name-group');
        const companySelect = document.getElementById('company-name');
        const visitCompanyRadio = document.getElementById('visit-company');

        if (companyGroup && companySelect && visitCompanyRadio) {
            if (visitCompanyRadio.checked) {
                companyGroup.style.display = '';
                companySelect.required = true;
            } else {
                companyGroup.style.display = 'none';
                companySelect.required = false;
                companySelect.value = '';
                clearFieldError(companySelect);
            }
        }

        // 2. ID Scan File Upload: Show only if "Paper registration form received" is checked
        const paperReceivedCheckbox = document.getElementById('paper-form-received');
        const fileGroup = document.getElementById('file-upload-group');
        const fileInput = document.getElementById('id-scan');
        const dropZone = document.getElementById('drop-zone');
        const fileNameDisplay = document.getElementById('file-name-display');

        if (paperReceivedCheckbox && fileGroup) {
            if (paperReceivedCheckbox.checked) {
                fileGroup.style.display = '';
            } else {
                fileGroup.style.display = 'none';
                if (fileInput) {
                    fileInput.value = '';
                    clearFieldError(fileInput);
                }
                if (fileNameDisplay) fileNameDisplay.textContent = '';
                if (dropZone) dropZone.classList.remove('has-file');
            }
        }
    }

    // --- POPULATE VERTICAL SUMMARY TABLE WITH IMAGE PREVIEW FOR STEP 5 ---
    function populateSummaryTable() {
        const tableBody = document.getElementById('summary-table-body');
        if (!tableBody) return;

        const getInputValue = (name) => {
            const input = form.querySelector(`[name="${name}"]`);
            if (!input) return 'N/A';

            if (input.type === 'radio') {
                const checked = form.querySelector(`[name="${name}"]:checked`);
                if (!checked) return 'None selected';
                const label = form.querySelector(`label[for="${checked.id}"]`);
                return label ? label.textContent.trim() : checked.value;
            }

            if (input.tagName === 'SELECT') {
                const selectedOption = input.options[input.selectedIndex];
                return (selectedOption && selectedOption.value) ? selectedOption.textContent.trim() : 'N/A';
            }

            return input.value.trim() || 'N/A';
        };

        const getCheckboxesValues = (name) => {
            const checkedBoxes = form.querySelectorAll(`[name="${name}"]:checked`);
            if (checkedBoxes.length === 0) return 'None';

            return Array.from(checkedBoxes).map(cb => {
                const label = form.querySelector(`label[for="${cb.id}"]`);
                return label ? label.textContent.trim() : cb.value;
            }).join(', ');
        };

        // Handle uploaded image preview
        const fileInput = document.getElementById('id-scan');
        let fileDisplay = 'No file uploaded';

        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.type.startsWith('image/')) {
                const imageUrl = URL.createObjectURL(file);
                fileDisplay = `
                    <div class="summary-image-preview">
                        <img src="${imageUrl}" alt="Uploaded Patient ID / Scan" style="max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 6px; display: block;" />
                        <small style="color: #64748b;">${file.name}</small>
                    </div>
                `;
            } else {
                fileDisplay = `<span>${file.name}</span> <small style="color: #64748b;">(${file.type || 'PDF Document'})</small>`;
            }
        }

        const isCompanyVisit = form.querySelector('#visit-company')?.checked;
        const isPaperFormChecked = form.querySelector('#paper-form-received')?.checked;

        const summaryRows = [
            { label: 'First Name', value: getInputValue('givenName') },
            { label: 'Middle Name', value: getInputValue('middleName') },
            { label: 'Last Name', value: getInputValue('familyName') },
            { label: 'Date of Birth', value: getInputValue('birthDate') },
            { label: 'Sex', value: getInputValue('sex') },
            { label: 'Civil Status', value: getInputValue('civilStatus') },
            { label: 'Contact Number', value: getInputValue('contactNumber') },
            { label: 'Email Address', value: getInputValue('email') },
            { label: 'Home Address', value: getInputValue('homeAddress') },
            { label: 'Visit Classification', value: getInputValue('visitClassification') }
        ];

        if (isCompanyVisit) {
            summaryRows.push({ label: 'Company Name', value: getInputValue('companyName') });
        }

        summaryRows.push(
            { label: 'Department Routing', value: getCheckboxesValues('departmentRouting') },
            { label: 'Paper Form Received', value: isPaperFormChecked ? 'Yes' : 'No' }
        );

        if (isPaperFormChecked) {
            summaryRows.push({ label: 'Uploaded Document / ID', value: fileDisplay });
        }

        tableBody.innerHTML = summaryRows.map(row => `
            <tr>
                <th scope="row" style="text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 40%; vertical-align: top;">${row.label}</th>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${row.value}</td>
            </tr>
        `).join('');
    }

    // --- LOCALSTORAGE PERSISTENCE LOGIC ---
    function saveFormToLocalStorage() {
        if (currentStep === 4) return; // Do not overwrite draft if already completed

        const formData = {};
        const elements = form.querySelectorAll('input, select, textarea');

        elements.forEach(input => {
            if (!input.name || input.type === 'file' || input.type === 'hidden') return;

            if (input.type === 'checkbox') {
                if (!formData[input.name]) {
                    formData[input.name] = [];
                }
                if (input.checked) {
                    formData[input.name].push(input.value);
                }
            } else if (input.type === 'radio') {
                if (input.checked) {
                    formData[input.name] = input.value;
                }
            } else {
                formData[input.name] = input.value;
            }
        });

        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(formData));
        localStorage.setItem(STORAGE_KEY_STEP, currentStep.toString());
    }

    function restoreFormFromLocalStorage() {
        const savedData = localStorage.getItem(STORAGE_KEY_DATA);
        const savedStep = localStorage.getItem(STORAGE_KEY_STEP);

        if (savedData) {
            try {
                const formData = JSON.parse(savedData);

                Object.keys(formData).forEach(name => {
                    const value = formData[name];
                    const inputs = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);

                    inputs.forEach(input => {
                        if (input.type === 'file') return;

                        if (input.type === 'checkbox') {
                            if (Array.isArray(value)) {
                                input.checked = value.includes(input.value);
                            } else {
                                input.checked = (input.value === value);
                            }
                        } else if (input.type === 'radio') {
                            input.checked = (input.value === value);
                        } else {
                            input.value = value;
                        }
                    });
                });
            } catch (err) {
                console.error('Failed to parse saved form data from localStorage:', err);
            }
        }

        updateConditionalFields();

        if (savedStep !== null) {
            const parsedStep = parseInt(savedStep, 10);
            if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < steps.length) {
                currentStep = parsedStep;
            }
        }

        updateStepVisibility(currentStep, false);
    }

    function clearFormLocalStorage() {
        localStorage.removeItem(STORAGE_KEY_DATA);
        localStorage.removeItem(STORAGE_KEY_STEP);
    }

    // Event listeners
    form.addEventListener('input', (e) => {
        if (e.target.matches('input, select, textarea')) {
            if (e.target.id === 'home-address') {
                validateAddressInput(e.target);
            }
            clearFieldError(e.target);
            updateConditionalFields();
            saveFormToLocalStorage();
        }
    });

    form.addEventListener('change', (e) => {
        if (e.target.matches('input, select, textarea')) {
            if (e.target.id === 'home-address') {
                validateAddressInput(e.target);
            }
            clearFieldError(e.target);
            updateConditionalFields();
            saveFormToLocalStorage();
        }
    });

    // Drag-and-Drop Visual State Handler
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('id-scan');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('drag-over');
            });
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                fileNameDisplay.textContent = `Selected file: ${fileName}`;
                dropZone.classList.add('has-file');
                clearFieldError(fileInput);
            } else {
                fileNameDisplay.textContent = '';
                dropZone.classList.remove('has-file');
            }
        });
    }

    function updateStepVisibility(stepIndex, scrollIntoView = true) {
        steps.forEach((step, idx) => {
            step.classList.toggle('active', idx === stepIndex);
        });

        stepIndicators.forEach((indicator, idx) => {
            indicator.classList.toggle('active', idx === stepIndex);
            indicator.classList.toggle('completed', idx < stepIndex);
        });

        if (scrollIntoView) {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Native Validity API Step Validator
    function validateStep(stepIndex) {
        const currentStepEl = steps[stepIndex];
        const inputs = Array.from(currentStepEl.querySelectorAll('input, select, textarea'));
        let isValid = true;
        let firstInvalidInput = null;
        const processedRadioGroups = new Set();

        inputs.forEach(input => {
            if (input.type === 'hidden' || input.disabled) return;

            if (input.id === 'home-address') {
                validateAddressInput(input);
            }

            // Skip hidden conditional fields
            const fieldParent = input.closest('.field');
            if (fieldParent && getComputedStyle(fieldParent).display === 'none') {
                return;
            }

            if (!input.checkValidity()) {
                isValid = false;
                if (!firstInvalidInput) firstInvalidInput = input;

                if (input.type === 'radio') {
                    if (!processedRadioGroups.has(input.name)) {
                        showFieldError(input);
                        processedRadioGroups.add(input.name);
                    }
                } else {
                    showFieldError(input);
                }
            } else {
                clearFieldError(input);
            }
        });

        if (firstInvalidInput) {
            firstInvalidInput.focus();
        }

        return isValid;
    }

    // Navigation and Action Handlers
    form.addEventListener('click', (e) => {
        if (e.target.matches('.btn-next')) {
            if (validateStep(currentStep)) {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    updateStepVisibility(currentStep);
                    saveFormToLocalStorage();
                }
            }
        } else if (e.target.matches('.btn-prev')) {
            if (currentStep > 0) {
                currentStep--;
                updateStepVisibility(currentStep);
                saveFormToLocalStorage();
            }
        } else if (e.target.matches('.btn-fill-again')) {
            form.reset();
            clearFormLocalStorage();
            updateConditionalFields();
            currentStep = 0;
            updateStepVisibility(currentStep);
        }
    });

    // Final Form Submission Handler (Step 4 -> Step 5)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateStep(currentStep)) {
            populateSummaryTable();
            clearFormLocalStorage();
            currentStep = 4; // Move to Step 5
            updateStepVisibility(currentStep);
        }
    });

    // Reset Form Listener
    form.addEventListener('reset', () => {
        currentStep = 0;
        updateStepVisibility(currentStep);
        clearFormLocalStorage();
        form.querySelectorAll('.field-error').forEach(err => err.textContent = '');
        form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
        if (dropZone) dropZone.classList.remove('has-file');

        setTimeout(updateConditionalFields, 0);
    });

    restoreFormFromLocalStorage();


    // ==========================================
// SUPPORTING FORM 2: STREAMLINED PATIENT SEARCH
// ==========================================

const searchForm = document.getElementById('patient-search-form');
const resultsBody = document.getElementById('search-results-body');
const resultsCount = document.getElementById('results-count');

const mockPatients = [
    { id: 'P-1001', givenName: 'Maria', familyName: 'Gonzales', dob: '1992-05-14', sex: 'female', classification: 'company', visitDate: '2026-10-25', queueStatus: 'waiting' },
    { id: 'P-1002', givenName: 'Juan', familyName: 'Dela Cruz', dob: '1985-11-03', sex: 'male', classification: 'out-of-pocket', visitDate: '2026-10-20', queueStatus: 'completed' },
    { id: 'P-1003', givenName: 'Anna', familyName: 'Santos', dob: '1998-01-22', sex: 'female', classification: 'walk-in', visitDate: '2026-10-27', queueStatus: 'in-consultation' },
    { id: 'P-1004', givenName: 'Carlos', familyName: 'Reyes', dob: '1976-08-19', sex: 'male', classification: 'company', visitDate: '2026-10-15', queueStatus: 'in-lab' },
    { id: 'P-1005', givenName: 'Elena', familyName: 'Bautista', dob: '1960-12-05', sex: 'female', classification: 'walk-in', visitDate: '2026-09-10', queueStatus: 'completed' },
    { id: 'P-1006', givenName: 'Mark', familyName: 'Gonzales', dob: '2001-03-30', sex: 'male', classification: 'out-of-pocket', visitDate: '2026-10-26', queueStatus: 'waiting' },
    { id: 'P-1007', givenName: 'Sophia', familyName: 'Mendoza', dob: '1995-07-11', sex: 'female', classification: 'company', visitDate: '2026-10-01', queueStatus: 'cancelled' }
];

function renderSearchResults(patients) {
    if (!resultsBody || !resultsCount) return;

    resultsCount.textContent = patients.length.toString();

    if (patients.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 16px; color: #64748b;">
                    No patients found matching your search and filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    resultsBody.innerHTML = patients.map(p => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: 600;">${p.id}</td>
            <td style="padding: 10px;">${p.givenName} ${p.familyName}</td>
            <td style="padding: 10px;">${p.dob}</td>
            <td style="padding: 10px; text-transform: capitalize;">${p.sex}</td>
            <td style="padding: 10px; text-transform: capitalize;">${p.classification}</td>
            <td style="padding: 10px;">${p.visitDate}</td>
            <td style="padding: 10px; text-transform: capitalize;">${p.queueStatus.replace('-', ' ')}</td>
        </tr>
    `).join('');
}

function filterPatients() {
    if (!searchForm) return;

    const keyword = document.getElementById('search-keyword')?.value.trim().toLowerCase() || '';
    const sex = document.getElementById('search-sex')?.value || '';
    const classification = document.getElementById('search-classification')?.value || '';
    const queueStatus = document.getElementById('queue-status')?.value || '';
    const visitFrom = document.getElementById('visit-date-from')?.value || '';
    const visitTo = document.getElementById('visit-date-to')?.value || '';

    const filtered = mockPatients.filter(patient => {
        // Keyword Search (Name or Patient ID)
        if (keyword) {
            const fullName = `${patient.givenName} ${patient.familyName}`.toLowerCase();
            const patientId = patient.id.toLowerCase();
            if (!fullName.includes(keyword) && !patientId.includes(keyword)) {
                return false;
            }
        }

        if (sex && patient.sex !== sex) return false;
        if (classification && patient.classification !== classification) return false;
        if (queueStatus && patient.queueStatus !== queueStatus) return false;
        if (visitFrom && patient.visitDate < visitFrom) return false;
        if (visitTo && patient.visitDate > visitTo) return false;

        return true;
    });

    renderSearchResults(filtered);
}

if (searchForm) {
    // Form Submit Search
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        filterPatients();
    });

    // Form Reset Search
    searchForm.addEventListener('reset', () => {
        setTimeout(filterPatients, 0);
    });

    // Real-time filtering as user types or changes dropdowns
    searchForm.addEventListener('input', filterPatients);
    searchForm.addEventListener('change', filterPatients);

    // Initial load
    filterPatients();
}

// ==========================================
// SUPPORTING FORM 1: LOGIN FORM LOGIC
// ==========================================

const loginForm = document.getElementById('patient-login-form');
const passwordInput = document.getElementById('login-password');
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

// Toggle Password Visibility Logic
function setPasswordVisibility(isVisible) {
    if (!passwordInput) return;

    passwordInput.type = isVisible ? 'text' : 'password';

    if (togglePasswordBtn) {
        const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
        const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');

        if (eyeOpen && eyeClosed) {
            eyeOpen.style.display = isVisible ? 'none' : 'block';
            eyeClosed.style.display = isVisible ? 'block' : 'none';
        }

        togglePasswordBtn.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
    }
}

// 1. Eye Icon Button Toggle Event
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const isCurrentlyVisible = passwordInput.type === 'text';
        setPasswordVisibility(!isCurrentlyVisible);
    });
}

// 3. Forgot Password Link Alert
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
        alert('went to forgot password!');
    });
}

// 4. Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validate basic inputs
        const emailInput = document.getElementById('login-email');
        let isValid = true;

        if (emailInput && !emailInput.checkValidity()) {
            showFieldError(emailInput);
            isValid = false;
        }

        if (passwordInput && !passwordInput.checkValidity()) {
            showFieldError(passwordInput);
            isValid = false;
        }

        if (isValid) {
            alert('Signed in successfully!');
            loginForm.reset();
            setPasswordVisibility(false);
        }
    });

    loginForm.addEventListener('reset', () => {
        setTimeout(() => {
            setPasswordVisibility(false);
            loginForm.querySelectorAll('.field-error').forEach(err => err.textContent = '');
            loginForm.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
        }, 0);
    });
}
});