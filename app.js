import { PGlite } from "@electric-sql/pglite";

let db;
const DB_NAME = 'patient_registration_db';
const PATIENTS_TABLE = 'patients';

// Quick uuid generator
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Set up our local DB
async function initializeDatabase(){
    try{
        db = new PGlite(`idb://${DB_NAME}`);
        await db.waitReady;

        // Create our table if it doesn't exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS ${PATIENTS_TABLE} (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                contact_phone TEXT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                gender TEXT NOT NULL
            )
        `);

        return true;
    } catch (error){
        console.error('DB init failed:', error);
        return false;
    }
}

// Toggle between different sections of the app
function showSection(sectionId){
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show the one we want
    document.getElementById(sectionId).classList.add('active');

    // Update nav to match
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('data-section') === sectionId){
            link.classList.add('active');
        }
    });

    // Load patients if we're on that page
    if(sectionId === 'patient-list'){
        loadPatients();
    }
}

// Load and display all patients
async function loadPatients(){
    const tableBody = document.getElementById('patient-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    const result = await getAllPatients();

    if(result.success){
        if(result.patients.length === 0){
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        // Format each patient row
        result.patients.forEach(patient => {
            const row = document.createElement('tr');
            const dob = new Date(patient.date_of_birth);
            const formattedDob = dob.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Make the ID look nicer in the UI
            const formattedId = `P-${patient.id.slice(0, 4).toUpperCase()}`;
            
            row.innerHTML = `
                <td><span class="patient-id">${formattedId}</span></td>
                <td>${patient.full_name}</td>
                <td>${formattedDob}</td>
                <td>${patient.gender}</td>
                <td>${patient.contact_phone || 'N/A'}</td>
            `;

            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading patients</td></tr>';
    }
}

// Get all patients, sorted by registration date
async function getAllPatients() {
    try {
        const result = await db.query(`SELECT * FROM ${PATIENTS_TABLE} ORDER BY registration_date DESC`);
        return { success: true, patients: result.rows || [] };
    } catch (error) {
        console.error('Failed to fetch patients:', error);
        return { success: false, error: error.message };
    }
}

// Register a new patient
async function registerPatient(fullName, dateOfBirth, contactPhone, gender){
    try{
        const patientId = generateUUID();
        await db.exec(`
            INSERT INTO ${PATIENTS_TABLE} (id, full_name, date_of_birth, contact_phone, gender)
            VALUES ('${patientId}', '${fullName}', '${dateOfBirth}', '${contactPhone}', '${gender}')
        `);

        return {success: true, patientId};
    } catch (error){
        console.error('Registration failed:', error);
        return {success: false, error: error.message};
    }
}

// Reset the database
async function resetDatabase(){
    try{
        await db.exec(`DROP TABLE IF EXISTS ${PATIENTS_TABLE}`);
        await db.exec(`
            CREATE TABLE ${PATIENTS_TABLE} (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                contact_phone TEXT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                gender TEXT NOT NULL
            );
        `);
        return { success: true };
    } catch (error){
        console.error('DB reset failed:', error);
    }
}

// Run SQL queries - only SELECT allowed
async function executeQuery(query){
    try{
        const trimmedQuery = query.trim().toLowerCase();
        if(!trimmedQuery.startsWith('select')){
            return {success: false, error: 'Only SELECT queries are supported'};
        }

        const result = await db.query(query);
        return {success: true, result: result.rows, columns : Object.keys(result.rows[0] || {})};
    } catch (error){
        return {success: false, error: error.message};
    }
}

// Display query results 
function displayQueryResults(result) {
    const headerRow = document.getElementById('query-results-header');
    const resultsBody = document.getElementById('query-results-body');
    const feedback = document.getElementById('query-feedback');
    
    if (result.success) {
        feedback.textContent = `Query executed successfully. ${result.result.length} rows returned.`;
        feedback.classList.add('success');
        feedback.classList.remove('error');
        
        // Set up the table headers
        headerRow.innerHTML = '';
        if (result.columns.length > 0) {
            const tr = document.createElement('tr');
            result.columns.forEach(column => {
                const th = document.createElement('th');
                th.textContent = column;
                tr.appendChild(th);
            });
            headerRow.appendChild(tr);
        }
        
        // Fill in the table body
        resultsBody.innerHTML = '';
        if (result.result.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${result.columns.length}">No results found</td>`;
            resultsBody.appendChild(tr);
        } else {
            result.result.forEach(row => {
                const tr = document.createElement('tr');
                result.columns.forEach(column => {
                    const td = document.createElement('td');
                    if (column === 'id') {
                        // Format IDs to match patient list
                        const formattedId = `P-${row[column].slice(0, 4).toUpperCase()}`;
                        td.innerHTML = `<span class="patient-id">${formattedId}</span>`;
                    } else if (column === 'date_of_birth') {
                        // Format dates nicely
                        const dob = new Date(row[column]);
                        td.textContent = dob.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    } else {
                        td.textContent = row[column] !== null ? row[column] : 'N/A';
                    }
                    tr.appendChild(td);
                });
                resultsBody.appendChild(tr);
            });
        }
    } else {
        feedback.textContent = `Error: ${result.error}`;
        feedback.classList.add('error');
        feedback.classList.remove('success');
        headerRow.innerHTML = '';
        resultsBody.innerHTML = '';
    }
}

// intialize the application

document.addEventListener('DOMContentLoaded', async () => {

    const dbInitialized = await initializeDatabase();
    if(!dbInitialized){
        alert('Failed to initialize the database. Please try again.');
        return;
    }

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Add reset database button event listener
    const resetDbButton = document.getElementById('reset-db');
    if (resetDbButton) {
        resetDbButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset the database? This will delete all patient data.')) {
                const result = await resetDatabase();
                if (result && result.success) {
                    alert('Database reset successfully');
                    if (document.getElementById('patient-list').classList.contains('active')) {
                        loadPatients();
                    }
                } else {
                    alert('Failed to reset database');
                }
            }
        });
    }

    const registerForm = document.getElementById('registration-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('full-name').value.trim();
            const dateOfBirth = document.getElementById('date-of-birth').value.trim();
            const contactPhone = document.getElementById('contact-phone').value.trim();
            const gender = document.getElementById('gender').value.trim();

            let isValid = true;

            if(!fullName){
                document.getElementById('full-name-error').textContent = 'Full name is required';
                isValid = false;
            } else {
                document.getElementById('full-name-error').textContent = '';
            }    

            if(!dateOfBirth){
                document.getElementById('date-of-birth-error').textContent = 'Date of birth is required';
                isValid = false;
            } else {
                document.getElementById('date-of-birth-error').textContent = '';
            }

            if(!gender){
                document.getElementById('gender-error').textContent = 'Gender is required';
                isValid = false;
            } else {
                document.getElementById('gender-error').textContent = '';
            }

            if(!isValid){
                return;
            }

            const feedback = document.getElementById('form-feedback');
            if (feedback) {
                feedback.textContent = 'Registering patient...';
                feedback.classList.remove('success', 'error');
            }

            try {
                const result = await registerPatient(fullName, dateOfBirth, contactPhone, gender);
                if(result.success){
                    if (feedback) {
                        feedback.textContent = 'Patient registered successfully!';
                        feedback.classList.remove('loading', 'error');
                        feedback.classList.add('success');
                    }
                    registerForm.reset();
                } else {
                    if (feedback) {
                        feedback.textContent = `Error: ${result.error}`;
                        feedback.classList.remove('loading', 'success');
                        feedback.classList.add('error');
                    }
                    console.error('Registration failed:', result.error);
                }
            } catch (error) {
                console.error('Error registering patient:', error);
                if (feedback) {
                    feedback.textContent = 'An error occurred. Please try again later.';
                    feedback.classList.remove('loading', 'success');
                    feedback.classList.add('error');
                }
            }

        });
    }

    const queryExecuteButton = document.getElementById('execute-query');
    queryExecuteButton.addEventListener('click', async (e) => {
        const sqlQuery = document.getElementById('sql-query-input').value.trim();
        
        if (!sqlQuery) {
            document.getElementById('query-feedback').textContent = 'Please enter a SQL query';
            document.getElementById('query-feedback').classList.add('error');
            return;
        }
        
        document.getElementById('query-feedback').textContent = 'Executing query...';
        document.getElementById('query-feedback').classList.remove('success', 'error');
        
        const result = await executeQuery(sqlQuery);
        displayQueryResults(result);
    })


            
}); 
    
    
