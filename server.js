const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');

// Serve static files (CSS, images)
app.use(express.static('public'));

// Connect to MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Devash@123',
    database: 'permit_db',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL');
});

// Route for form submission
app.post('/submit_form', async (req, res) => {
    const formData = {
        permit_number: req.body.permit_number,
        module: req.body.module,
        validity_from: req.body.validity_from,
        validity_till: req.body.validity_till,
        time_from: req.body.time_from,
        time_till: req.body.time_till,
        items: req.body.items,
        quantity: req.body.quantity,
        value: req.body.value,
        mmca_name: req.body.mmca_name,
        name: req.body.name,
        address: req.body.address,
        mobile: req.body.mobile,
        division: req.body.division,
        vrange: req.body.range,
        kist: req.body.kist,
        etp_number: req.body.etp_number,
        transit_module: req.body.transit_module,
        transit_item: req.body.transit_item,
        transit_quantity: req.body.transit_quantity,
        mahal: req.body.mahal,
        destination: req.body.destination,
        valid_from_date: req.body.valid_from_date,
        valid_from_time: req.body.valid_from_time,
        valid_to_date: req.body.valid_to_date,
        valid_to_time: req.body.valid_to_time,
        vehicle_number: req.body.vehicle_number,
        driver_info: req.body.driver_info,
        transit_division: req.body.transit_division,
        transit_range: req.body.transit_range,
        transit_permit_number: req.body.transit_permit_number,
    };

    const query = `INSERT INTO permit_transit SET ?`;

    db.query(query, formData, (err, result) => {
        if (err) {
            console.error('Error inserting data:', err.message);
            res.status(500).send('Database error');
            return;
        }

        // Add the inserted ID to the data
        formData.id = result.insertId;

        const pdfUrl = `/pdf/${result.insertId}`;
        res.render('details', { data: formData, pdfUrl });
    });
});

// Route to generate and serve the filled PDF
app.get('/pdf/:id', async (req, res) => {
    const query = 'SELECT * FROM permit_transit WHERE id = ?';

    db.query(query, [req.params.id], async (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetching data:', err || 'No results found');
            res.status(500).send('Error fetching data');
            return;
        }

        const permitTransit = results[0];

        try {
            // Load the existing PDF form
            const pdfTemplatePath = path.join(__dirname, 'pdf', 'final.pdf');

            if (!fs.existsSync(pdfTemplatePath)) {
                res.status(500).send('PDF template not found.');
                return;
            }

            const pdfBytes = fs.readFileSync(pdfTemplatePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Get the form from the PDF
            const form = pdfDoc.getForm();

            // Fill the form fields with validation
            const setText = (fieldName, value) => {
                try {
                    const field = form.getTextField(fieldName);
                    field.setText(value || '');
                } catch (e) {
                    console.warn(`Field "${fieldName}" not found in the PDF template.`);
                }
            };

            setText('permit_number', permitTransit.permit_number);
            setText('module', permitTransit.module);
            setText('validity_from', new Date(permitTransit.validity_from).toLocaleDateString());
            setText('validity_till', new Date(permitTransit.validity_till).toLocaleDateString());
            setText('time_from', permitTransit.time_from);
            setText('time_till', permitTransit.time_till);
            setText('items', permitTransit.items);
            setText('quantity', permitTransit.quantity?.toString());
            setText('value', permitTransit.value);
            setText('name', permitTransit.name);
            setText('driver_info', permitTransit.driver_info);
            setText('address', permitTransit.address);
            setText('mobile', permitTransit.mobile);
            setText('range', permitTransit.vrange);
            setText('kist', permitTransit.kist);
            setText('etp_number', permitTransit.etp_number);
            setText('mahal', permitTransit.mahal);
            setText('vehicle_number', permitTransit.vehicle_number);

            const pdfData = await pdfDoc.save();

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="9780.pdf"`,
            });

            res.send(Buffer.from(pdfData));
        } catch (err) {
            console.error('Error generating PDF:', err);
            res.status(500).send('Error generating PDF');
        }
    });
});

// Start server
app.listen(3001, () => {
    console.log('Server started on port 3001');
});
