const form = document.getElementById("inquiryForm");

if (form) {
  const langButtons = document.querySelectorAll(".lang-toggle");
  let currentLang = "es";
  const LANGUAGE_STORAGE_KEY = "healthcoreLang";

  const readSavedLanguage = () => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return saved === "en" || saved === "es" ? saved : null;
    } catch {
      return null;
    }
  };

  const saveLanguage = (lang) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors (private mode or blocked storage).
    }
  };

  const t = {
    en: {
      errors: {
        first_name: "First name must contain only letters and be at least 2 characters long",
        last_name: "Last name must contain only letters and be at least 2 characters long",
        invalid_dob: "Please enter a valid date of birth. The patient must be between 0 and 120 years old",
        email: "Please enter a valid email address (example: name@provider.com)",
        phone: "Phone number must include a country code (example: +1 305 555 0191)",
        preferred_language: "Please select your preferred language",
        preferred_clinic: "Please select the clinic you would like to visit",
        preferred_date: "Please select a date at least 1 business day from today and no more than 60 days ahead",
        preferred_time: "Please select your preferred time slot",
        service_type: "Please select the type of care you are looking for",
        paediatric_age:
          "Paediatric Care is available for patients under 18 years old. Please review the date of birth or select a different service.",
        new_patient: "Please indicate whether this is your first visit to HealthCore",
        has_insurance: "Please indicate whether you have health insurance",
        insurance_provider_required: "Please enter the name of your insurance provider",
        insurance_member_required: "Member ID must be between 6 and 20 alphanumeric characters",
        insurance_member_format: "Member ID must be between 6 and 20 alphanumeric characters",
        health_concern_min:
          "Please describe your medical concern in at least 20 characters ({{X}} characters remaining)",
        contact_consent: "You must give your consent to be contacted before submitting this form",
      },
      count: "{{count}} / 500 characters",
      evening_warning:
        "Warning: {{clinic}} closes at {{hour}}. The Evening (5pm-8pm) time slot may not be available.",
    },
    es: {
      errors: {
        first_name: "El nombre debe contener solo letras y tener al menos 2 caracteres",
        last_name: "El apellido debe contener solo letras y tener al menos 2 caracteres",
        invalid_dob: "Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años",
        email: "Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)",
        phone: "El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)",
        preferred_language: "Selecciona tu idioma preferido",
        preferred_clinic: "Selecciona la clínica que te gustaría visitar",
        preferred_date:
          "Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante",
        preferred_time: "Selecciona tu franja horaria preferida",
        service_type: "Selecciona el tipo de atención que estás buscando",
        paediatric_age:
          "Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente.",
        new_patient: "Indica si esta es tu primera visita a HealthCore",
        has_insurance: "Indica si tienes seguro médico",
        insurance_provider_required: "Ingresa el nombre de tu aseguradora",
        insurance_member_required: "El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos",
        insurance_member_format: "El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos",
        health_concern_min: "Describe tu consulta médica en al menos 20 caracteres (faltan {{X}} caracteres)",
        contact_consent: "Debes dar tu consentimiento para ser contactado antes de enviar este formulario",
      },
      count: "{{count}} / 500 caracteres",
      evening_warning:
        "Advertencia: {{clinic}} cierra a las {{hour}}. La franja Noche (5pm-8pm) podria no estar disponible.",
    },
  };

  const getMessage = (key, vars = {}) => {
    const selectedLang = currentLang === "en" ? "en" : "es";
    const parts = key.split(".");
    let value = t[selectedLang];
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== "string") {
      return "";
    }

    return Object.entries(vars).reduce(
      (acc, [varKey, varValue]) => acc.replaceAll(`{{${varKey}}}`, String(varValue)),
      value
    );
  };

  const applyLanguageToPage = (lang) => {
    currentLang = lang === "en" ? "en" : "es";
    document.documentElement.lang = currentLang;
    saveLanguage(currentLang);

    document.querySelectorAll("[data-en][data-es]").forEach((element) => {
      element.textContent = currentLang === "en" ? element.dataset.en : element.dataset.es;
    });

    document.querySelectorAll("[data-placeholder-en][data-placeholder-es]").forEach((element) => {
      element.setAttribute(
        "placeholder",
        currentLang === "en" ? element.dataset.placeholderEn : element.dataset.placeholderEs
      );
    });

    document.querySelectorAll("[data-aria-label-en][data-aria-label-es]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        currentLang === "en" ? element.dataset.ariaLabelEn : element.dataset.ariaLabelEs
      );
    });

    const titleElement = document.querySelector("title[data-title-en][data-title-es]");
    if (titleElement) {
      document.title = currentLang === "en" ? titleElement.dataset.titleEn : titleElement.dataset.titleEs;
    }

    const descriptionMeta = document.querySelector('meta[name="description"][data-content-en][data-content-es]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        "content",
        currentLang === "en" ? descriptionMeta.dataset.contentEn : descriptionMeta.dataset.contentEs
      );
    }

    langButtons.forEach((button) => {
      const active = button.dataset.lang === currentLang;
      button.classList.toggle("bg-teal-700", active);
      button.classList.toggle("text-white", active);
      button.classList.toggle("text-slate-700", !active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  const formMessage = document.getElementById("formMessage");
  const formSuccess = document.getElementById("formSuccess");
  const newInquiryButton = document.getElementById("newInquiryButton");
  const healthConcern = document.getElementById("health_concern");
  const healthConcernCount = document.getElementById("healthConcernCount");
  const patientIdGroup = document.getElementById("patientIdGroup");
  const insuranceFields = document.getElementById("insuranceFields");
  const patientIdInput = document.getElementById("patient_id");
  const insuranceProviderInput = document.getElementById("insurance_provider");
  const insuranceMemberIdInput = document.getElementById("insurance_member_id");
  const eveningAvailabilityWarning = document.getElementById("eveningAvailabilityWarning");

  const eveningLimitedClinics = {
    "HealthCore San Antonio": "6pm",
    "HealthCore Austin North": "7pm",
  };

  const getSelectedRadioValue = (name) => {
    const selected = form.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : "";
  };

  const isBusinessDay = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const getMinBusinessDate = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    do {
      date.setDate(date.getDate() + 1);
    } while (!isBusinessDay(date));
    return date;
  };

  const toDate = (value) => {
    if (!value) {
      return null;
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getAgeInYears = (dob, today) => {
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  };

  const dateToYmd = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const preferredDateInput = document.getElementById("preferred_date");
  const minBusinessDate = getMinBusinessDate();
  const maxPreferredDate = new Date(minBusinessDate);
  maxPreferredDate.setDate(maxPreferredDate.getDate() + 59);

  if (preferredDateInput) {
    preferredDateInput.min = dateToYmd(minBusinessDate);
    preferredDateInput.max = dateToYmd(maxPreferredDate);
  }

  const fields = {
    first_name: {
      input: document.getElementById("first_name"),
      error: document.getElementById("firstNameError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(cleanValue) || cleanValue.length < 2 || cleanValue.length > 50) {
          return getMessage("errors.first_name");
        }
        return "";
      },
    },
    last_name: {
      input: document.getElementById("last_name"),
      error: document.getElementById("lastNameError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(cleanValue) || cleanValue.length < 2 || cleanValue.length > 50) {
          return getMessage("errors.last_name");
        }
        return "";
      },
    },
    date_of_birth: {
      input: document.getElementById("date_of_birth"),
      error: document.getElementById("dateOfBirthError"),
      validate: (value) => {
        const invalidDobMessage = getMessage("errors.invalid_dob");
        if (!value) {
          return invalidDobMessage;
        }
        const dob = toDate(value);
        if (!dob) {
          return invalidDobMessage;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob > today) {
          return invalidDobMessage;
        }
        const oldest = new Date(today);
        oldest.setFullYear(oldest.getFullYear() - 120);
        if (dob < oldest) {
          return invalidDobMessage;
        }
        return "";
      },
    },
    email: {
      input: document.getElementById("email"),
      error: document.getElementById("emailError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
          return getMessage("errors.email");
        }
        return "";
      },
    },
    phone: {
      input: document.getElementById("phone"),
      error: document.getElementById("phoneError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue || !/^\+[1-9]\d{0,3}[\s-]?\d[\d\s-]{6,}$/.test(cleanValue)) {
          return getMessage("errors.phone");
        }
        return "";
      },
    },
    preferred_language: {
      input: document.getElementById("preferred_language"),
      error: document.getElementById("preferredLanguageError"),
      validate: (value) => {
        if (!value.trim()) {
          return getMessage("errors.preferred_language");
        }
        return "";
      },
    },
    preferred_clinic: {
      input: document.getElementById("preferred_clinic"),
      error: document.getElementById("preferredClinicError"),
      validate: (value) => {
        if (!value.trim()) {
          return getMessage("errors.preferred_clinic");
        }
        return "";
      },
    },
    preferred_date: {
      input: document.getElementById("preferred_date"),
      error: document.getElementById("preferredDateError"),
      validate: (value) => {
        const preferredDateMessage = getMessage("errors.preferred_date");
        if (!value) {
          return preferredDateMessage;
        }
        const selected = toDate(value);
        if (!selected) {
          return preferredDateMessage;
        }
        if (!isBusinessDay(selected)) {
          return preferredDateMessage;
        }
        if (selected < minBusinessDate) {
          return preferredDateMessage;
        }
        if (selected > maxPreferredDate) {
          return preferredDateMessage;
        }
        return "";
      },
    },
    preferred_time: {
      input: document.getElementById("preferred_time"),
      error: document.getElementById("preferredTimeError"),
      validate: (value) => {
        if (!value.trim()) {
          return getMessage("errors.preferred_time");
        }
        return "";
      },
    },
    service_type: {
      input: document.getElementById("service_type"),
      error: document.getElementById("serviceTypeError"),
      validate: (value) => {
        if (!value.trim()) {
          return getMessage("errors.service_type");
        }

        if (value === "Paediatric Care") {
          const dobValue = fields.date_of_birth?.input?.value;
          const dob = toDate(dobValue);
          if (dob) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const age = getAgeInYears(dob, today);
            if (age >= 18) {
              return getMessage("errors.paediatric_age");
            }
          }
        }

        return "";
      },
    },
    new_patient: {
      input: form.querySelector("input[name='new_patient']"),
      error: document.getElementById("newPatientError"),
      validate: () => {
        if (!getSelectedRadioValue("new_patient")) {
          return getMessage("errors.new_patient");
        }
        return "";
      },
    },
    patient_id: {
      input: patientIdInput,
      error: document.getElementById("patientIdError"),
      validate: (value) => {
        const cleanValue = value.trim();
        const newPatientValue = getSelectedRadioValue("new_patient");
        if (newPatientValue !== "No") {
          return "";
        }
        if (!cleanValue) {
          return "";
        }
        return "";
      },
    },
    has_insurance: {
      input: form.querySelector("input[name='has_insurance']"),
      error: document.getElementById("hasInsuranceError"),
      validate: () => {
        if (!getSelectedRadioValue("has_insurance")) {
          return getMessage("errors.has_insurance");
        }
        return "";
      },
    },
    insurance_provider: {
      input: insuranceProviderInput,
      error: document.getElementById("insuranceProviderError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (getSelectedRadioValue("has_insurance") !== "Yes") {
          return "";
        }
        if (!cleanValue) {
          return getMessage("errors.insurance_provider_required");
        }
        return "";
      },
    },
    insurance_member_id: {
      input: insuranceMemberIdInput,
      error: document.getElementById("insuranceMemberIdError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (getSelectedRadioValue("has_insurance") !== "Yes") {
          return "";
        }
        if (!cleanValue) {
          return getMessage("errors.insurance_member_required");
        }
        if (!/^[A-Za-z0-9]{6,20}$/.test(cleanValue)) {
          return getMessage("errors.insurance_member_format");
        }
        return "";
      },
    },
    health_concern: {
      input: healthConcern,
      error: document.getElementById("healthConcernError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (cleanValue.length < 20) {
          const missingChars = 20 - cleanValue.length;
          return getMessage("errors.health_concern_min", { X: missingChars });
        }
        return "";
      },
    },
    contact_consent: {
      input: document.getElementById("contact_consent"),
      error: document.getElementById("contactConsentError"),
      validate: (_, input) => {
        if (!input.checked) {
          return getMessage("errors.contact_consent");
        }
        return "";
      },
    },
  };

  const setErrorState = (fieldKey, errorMessage) => {
    const field = fields[fieldKey];
    if (!field || !field.input || !field.error) {
      return;
    }

    const isValid = errorMessage === "";
    field.error.classList.toggle("hidden", isValid);
    field.error.textContent = errorMessage;

    if (field.input.type === "checkbox") {
      field.input.setAttribute("aria-invalid", isValid ? "false" : "true");
      field.input.classList.toggle("ring-2", !isValid);
      field.input.classList.toggle("ring-red-500", !isValid);
      field.input.classList.toggle("border-red-500", !isValid);
      return;
    }

    if (field.input.type === "radio") {
      const radios = form.querySelectorAll(`input[name="${field.input.name}"]`);
      radios.forEach((radio) => {
        radio.setAttribute("aria-invalid", isValid ? "false" : "true");
        radio.classList.toggle("ring-2", !isValid);
        radio.classList.toggle("ring-red-500", !isValid);
        radio.classList.toggle("border-red-500", !isValid);
      });
      return;
    }

    field.input.setAttribute("aria-invalid", isValid ? "false" : "true");
    field.input.classList.toggle("border-red-500", !isValid);
  };

  const validateField = (fieldKey) => {
    const field = fields[fieldKey];
    if (!field || !field.input) {
      return true;
    }

    const inputValue = field.input.type === "checkbox" ? String(field.input.checked) : field.input.value;
    const errorMessage = field.validate(inputValue, field.input);
    setErrorState(fieldKey, errorMessage);
    return errorMessage === "";
  };

  const updateConditionalSections = () => {
    const newPatientValue = getSelectedRadioValue("new_patient");
    const hasInsuranceValue = getSelectedRadioValue("has_insurance");

    if (patientIdGroup && patientIdInput) {
      const showPatientId = newPatientValue === "No";
      patientIdGroup.classList.toggle("hidden", !showPatientId);
      if (!showPatientId) {
        patientIdInput.value = "";
        setErrorState("patient_id", "");
      }
    }

    if (insuranceFields && insuranceProviderInput && insuranceMemberIdInput) {
      const showInsurance = hasInsuranceValue === "Yes";
      insuranceFields.classList.toggle("hidden", !showInsurance);
      insuranceProviderInput.required = showInsurance;
      insuranceMemberIdInput.required = showInsurance;
      if (!showInsurance) {
        insuranceProviderInput.value = "";
        insuranceMemberIdInput.value = "";
        setErrorState("insurance_provider", "");
        setErrorState("insurance_member_id", "");
      }
    }
  };

  const updateHealthConcernCount = () => {
    if (!healthConcern || !healthConcernCount) {
      return;
    }
    healthConcernCount.textContent = getMessage("count", { count: healthConcern.value.length });
  };

  const updateEveningAvailabilityWarning = () => {
    if (!eveningAvailabilityWarning) {
      return;
    }

    const selectedTime = fields.preferred_time?.input?.value || "";
    const selectedClinic = fields.preferred_clinic?.input?.value || "";

    if (selectedTime !== "Evening (5pm-8pm)") {
      eveningAvailabilityWarning.textContent = "";
      eveningAvailabilityWarning.classList.add("hidden");
      return;
    }

    const clinicClosingHour = eveningLimitedClinics[selectedClinic];
    if (clinicClosingHour) {
      eveningAvailabilityWarning.textContent = getMessage("evening_warning", {
        clinic: selectedClinic,
        hour: clinicClosingHour,
      });
      eveningAvailabilityWarning.classList.remove("hidden");
      return;
    }

    eveningAvailabilityWarning.textContent = "";
    eveningAvailabilityWarning.classList.add("hidden");
  };

  const updateVisibleErrorsForLanguage = () => {
    Object.keys(fields).forEach((fieldKey) => {
      const field = fields[fieldKey];
      if (field?.error && !field.error.classList.contains("hidden")) {
        validateField(fieldKey);
      }
    });

    if (formMessage && formMessage.className.includes("border-red-200")) {
      formMessage.textContent = "";
    }
  };

  Object.keys(fields).forEach((fieldKey) => {
    const field = fields[fieldKey];
    if (!field || !field.input) {
      return;
    }

    if (field.input.type === "checkbox") {
      field.input.addEventListener("change", () => validateField(fieldKey));
      return;
    }

    if (field.input.type === "radio") {
      const radios = form.querySelectorAll(`input[name="${field.input.name}"]`);
      radios.forEach((radio) => {
        radio.addEventListener("change", () => {
          validateField(fieldKey);
          updateConditionalSections();
          validateField("patient_id");
          validateField("insurance_provider");
          validateField("insurance_member_id");
        });
      });
      return;
    }

    field.input.addEventListener("input", () => {
      validateField(fieldKey);
      if (fieldKey === "date_of_birth") {
        validateField("service_type");
      }
      if (fieldKey === "health_concern") {
        updateHealthConcernCount();
      }
      if (fieldKey === "preferred_time" || fieldKey === "preferred_clinic") {
        updateEveningAvailabilityWarning();
      }
    });

    field.input.addEventListener("change", () => {
      validateField(fieldKey);
      if (fieldKey === "date_of_birth") {
        validateField("service_type");
      }
      if (fieldKey === "service_type") {
        validateField("date_of_birth");
      }
      if (fieldKey === "preferred_time" || fieldKey === "preferred_clinic") {
        updateEveningAvailabilityWarning();
      }
    });

    field.input.addEventListener("blur", () => validateField(fieldKey));
  });

  updateConditionalSections();
  updateHealthConcernCount();
  updateEveningAvailabilityWarning();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    updateConditionalSections();
    updateEveningAvailabilityWarning();

    const validationOrder = [
      "first_name",
      "last_name",
      "date_of_birth",
      "email",
      "phone",
      "preferred_language",
      "preferred_clinic",
      "preferred_date",
      "preferred_time",
      "service_type",
      "new_patient",
      "patient_id",
      "has_insurance",
      "insurance_provider",
      "insurance_member_id",
      "health_concern",
      "contact_consent",
    ];

    let allValid = true;
    let firstInvalidKey = "";

    validationOrder.forEach((fieldKey) => {
      const isFieldValid = validateField(fieldKey);
      if (!isFieldValid) {
        allValid = false;
        if (!firstInvalidKey) {
          firstInvalidKey = fieldKey;
        }
      }
    });

    if (!formMessage) {
      return;
    }

    if (!allValid) {
      formMessage.textContent = "";
      formMessage.className = "text-sm font-medium";

      if (firstInvalidKey && fields[firstInvalidKey]?.input) {
        fields[firstInvalidKey].input.focus();
      }
      return;
    }

    form.reset();
    updateConditionalSections();
    updateHealthConcernCount();
    updateEveningAvailabilityWarning();

    Object.keys(fields).forEach((fieldKey) => setErrorState(fieldKey, ""));

    form.classList.add("hidden");
    if (formSuccess) {
      formSuccess.classList.remove("hidden");
    }

    formMessage.textContent = "";
    formMessage.className = "text-sm font-medium";
  });

  form.addEventListener("reset", () => {
    updateConditionalSections();
    updateHealthConcernCount();
    Object.keys(fields).forEach((fieldKey) => setErrorState(fieldKey, ""));

    if (formMessage) {
      formMessage.textContent = "";
      formMessage.className = "text-sm font-medium";
    }
  });

  if (newInquiryButton) {
    newInquiryButton.addEventListener("click", () => {
      if (formSuccess) {
        formSuccess.classList.add("hidden");
      }
      form.classList.remove("hidden");
      form.reset();
      updateConditionalSections();
      updateHealthConcernCount();
      updateEveningAvailabilityWarning();
      Object.keys(fields).forEach((fieldKey) => setErrorState(fieldKey, ""));
      const firstNameInput = fields.first_name?.input;
      if (firstNameInput) {
        firstNameInput.focus();
      }
    });
  }

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguageToPage(button.dataset.lang);
      updateHealthConcernCount();
      updateEveningAvailabilityWarning();
      updateVisibleErrorsForLanguage();
    });
  });

  applyLanguageToPage(readSavedLanguage() || (document.documentElement.lang === "en" ? "en" : "es"));
}
