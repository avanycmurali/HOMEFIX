import express from 'express';
import { getAllServices } from '../controllers/servicesController.js';

const router = express.Router();

// GET /api/services - Retrieve all available service categories
router.get('/', getAllServices);

export default router;
