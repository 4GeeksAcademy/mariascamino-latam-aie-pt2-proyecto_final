const form = document.getElementById("registrationForm");

if (form) {
  const formMessage = document.getElementById("formMessage");
  const formSuccess = document.getElementById("formSuccess");
  const newRegistrationButton = document.getElementById("newRegistrationButton");
  const healthConcern = document.getElementById("health_concern");
  const healthConcernCount = document.getElementById("healthConcernCount");
  const patientIdGroup = document.getElementById("patientIdGroup");
  const insuranceFields = document.getElementById("insuranceFields");
  const patientIdInput = document.getElementById("patient_id");
  const insuranceProviderInput = document.getElementById("insurance_provider");
  const insuranceMemberIdInput = document.getElementById("insurance_member_id");

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
        if (!cleanValue) {
          return "El nombre es obligatorio.";
        }
        if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(cleanValue)) {
          return "El nombre solo puede incluir letras y acentos.";
        }
        if (cleanValue.length < 2 || cleanValue.length > 50) {
          return "El nombre debe tener entre 2 y 50 caracteres.";
        }
        return "";
      },
    },
    last_name: {
      input: document.getElementById("last_name"),
      error: document.getElementById("lastNameError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue) {
          return "El apellido es obligatorio.";
        }
        if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(cleanValue)) {
          return "El apellido solo puede incluir letras y acentos.";
        }
        if (cleanValue.length < 2 || cleanValue.length > 50) {
          return "El apellido debe tener entre 2 y 50 caracteres.";
        }
        return "";
      },
    },
    date_of_birth: {
      input: document.getElementById("date_of_birth"),
      error: document.getElementById("dateOfBirthError"),
      validate: (value) => {
        if (!value) {
          return "La fecha de nacimiento es obligatoria.";
        }
        const dob = toDate(value);
        if (!dob) {
          return "Ingresa una fecha de nacimiento válida.";
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob > today) {
          return "La fecha de nacimiento no puede ser futura.";
        }
        const oldest = new Date(today);
        oldest.setFullYear(oldest.getFullYear() - 120);
        if (dob < oldest) {
          return "La fecha de nacimiento no puede superar 120 años.";
        }
        return "";
      },
    },
    email: {
      input: document.getElementById("email"),
      error: document.getElementById("emailError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue) {
          return "El correo electrónico es obligatorio.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
          return "Ingresa un correo electrónico válido.";
        }
        return "";
      },
    },
    phone: {
      input: document.getElementById("phone"),
      error: document.getElementById("phoneError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue) {
          return "El telefono es obligatorio.";
        }
        if (!/^\+[1-9]\d{0,3}[\s-]?\d[\d\s-]{6,}$/.test(cleanValue)) {
          return "El telefono debe iniciar con codigo de pais (ej: +1 305 555 0191).";
        }
        return "";
      },
    },
    preferred_language: {
      input: document.getElementById("preferred_language"),
      error: document.getElementById("preferredLanguageError"),
      validate: (value) => {
        if (!value.trim()) {
          return "Selecciona un idioma preferido.";
        }
        return "";
      },
    },
    preferred_clinic: {
      input: document.getElementById("preferred_clinic"),
      error: document.getElementById("preferredClinicError"),
      validate: (value) => {
        if (!value.trim()) {
          return "Selecciona una clínica preferida.";
        }
        return "";
      },
    },
    preferred_date: {
      input: document.getElementById("preferred_date"),
      error: document.getElementById("preferredDateError"),
      validate: (value) => {
        if (!value) {
          return "La fecha preferida es obligatoria.";
        }
        const selected = toDate(value);
        if (!selected) {
          return "Ingresa una fecha preferida válida.";
        }
        if (!isBusinessDay(selected)) {
          return "La fecha preferida debe ser un dia habil.";
        }
        if (selected < minBusinessDate) {
          return "La fecha preferida debe ser al menos 1 dia habil desde hoy.";
        }
        if (selected > maxPreferredDate) {
          return "La fecha preferida no puede superar los 60 días.";
        }
        return "";
      },
    },
    preferred_time: {
      input: document.getElementById("preferred_time"),
      error: document.getElementById("preferredTimeError"),
      validate: (value) => {
        if (!value.trim()) {
          return "Selecciona una franja horaria.";
        }
        return "";
      },
    },
    service_type: {
      input: document.getElementById("service_type"),
      error: document.getElementById("serviceTypeError"),
      validate: (value) => {
        if (!value.trim()) {
          return "Selecciona un servicio requerido.";
        }
        return "";
      },
    },
    new_patient: {
      input: form.querySelector("input[name='new_patient']"),
      error: document.getElementById("newPatientError"),
      validate: () => {
        if (!getSelectedRadioValue("new_patient")) {
          return "Selecciona si es tu primera visita.";
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
        if (!/^HC-[A-Za-z0-9]{6}$/.test(cleanValue)) {
          return "El ID debe tener formato HC- seguido de 6 caracteres alfanuméricos.";
        }
        return "";
      },
    },
    has_insurance: {
      input: form.querySelector("input[name='has_insurance']"),
      error: document.getElementById("hasInsuranceError"),
      validate: () => {
        if (!getSelectedRadioValue("has_insurance")) {
          return "Selecciona si tienes seguro médico.";
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
          return "El proveedor de seguro es obligatorio cuando tienes seguro.";
        }
        if (cleanValue.length > 100) {
          return "El proveedor de seguro no puede superar 100 caracteres.";
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
          return "El ID de miembro del seguro es obligatorio cuando tienes seguro.";
        }
        if (!/^[A-Za-z0-9]{6,20}$/.test(cleanValue)) {
          return "El ID de miembro debe tener entre 6 y 20 caracteres alfanuméricos.";
        }
        return "";
      },
    },
    health_concern: {
      input: healthConcern,
      error: document.getElementById("healthConcernError"),
      validate: (value) => {
        const cleanValue = value.trim();
        if (!cleanValue) {
          return "La descripcion de la consulta es obligatoria.";
        }
        if (cleanValue.length < 20) {
          return "La descripcion debe tener al menos 20 caracteres.";
        }
        if (cleanValue.length > 500) {
          return "La descripcion no puede superar 500 caracteres.";
        }
        return "";
      },
    },
    contact_consent: {
      input: document.getElementById("contact_consent"),
      error: document.getElementById("contactConsentError"),
      validate: (_, input) => {
        if (!input.checked) {
          return "Debes aceptar el consentimiento de contacto para enviar.";
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
    healthConcernCount.textContent = `${healthConcern.value.length} / 500 caracteres`;
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
      if (fieldKey === "health_concern") {
        updateHealthConcernCount();
      }
    });

    field.input.addEventListener("change", () => {
      validateField(fieldKey);
    });

    field.input.addEventListener("blur", () => validateField(fieldKey));
  });

  updateConditionalSections();
  updateHealthConcernCount();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    updateConditionalSections();

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
      formMessage.textContent = "Revisa los campos marcados antes de continuar.";
      formMessage.className = "w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:w-auto";

      if (firstInvalidKey && fields[firstInvalidKey]?.input) {
        fields[firstInvalidKey].input.focus();
      }
      return;
    }

    form.reset();
    updateConditionalSections();
    updateHealthConcernCount();

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

  if (newRegistrationButton) {
    newRegistrationButton.addEventListener("click", () => {
      if (formSuccess) {
        formSuccess.classList.add("hidden");
      }
      form.classList.remove("hidden");
      form.reset();
      updateConditionalSections();
      updateHealthConcernCount();
      Object.keys(fields).forEach((fieldKey) => setErrorState(fieldKey, ""));
      const firstNameInput = fields.first_name?.input;
      if (firstNameInput) {
        firstNameInput.focus();
      }
    });
  }
}
