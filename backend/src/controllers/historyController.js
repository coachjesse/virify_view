const { getFirestore, admin } = require('../config/firebase');

const COLLECTION_NAME = 'watchTimeHistory';

/**
 * Add a new watch time history entry
 * POST /api/history
 */
const addHistory = async (req, res, next) => {
  try {
    const { email, ip, watchedTime } = req.body;

    // Validate required fields
    if (!email || !watchedTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: uid, email, and watchedTime are required',
      });
    }

    const db = getFirestore();
    const historyData = {
      email,
      ip: ip || req.ip || req.headers['x-forwarded-for'] || 'unknown',
      watchedTime: Number(watchedTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTION_NAME).add(historyData);

    res.status(201).json({
      success: true,
      message: 'History added successfully',
      data: {
        id: docRef.id,
        ...historyData,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error adding history:', error);
    next(error);
  }
};

/**
 * Get all watch time history entries
 * GET /api/history
 * Query params: uid (optional) - filter by user ID
 */
const getHistorys = async (req, res, next) => {
  try {
    const { uid } = req.query;
    const db = getFirestore();
    let query = db.collection(COLLECTION_NAME);

    // Filter by uid if provided
    if (uid) {
      query = query.where('uid', '==', uid);
    }

    // Order by createdAt descending (newest first)
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No history found',
        data: [],
      });
    }

    const historys = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    res.json({
      success: true,
      message: 'History retrieved successfully',
      data: historys,
      count: historys.length,
    });
  } catch (error) {
    console.error('Error getting history:', error);
    next(error);
  }
};

/**
 * Delete a watch time history entry by ID
 * DELETE /api/history/:id
 */
const deleteHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'History ID is required',
      });
    }

    const db = getFirestore();
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'History not found',
      });
    }

    await docRef.delete();

    res.json({
      success: true,
      message: 'History deleted successfully',
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    next(error);
  }
};

module.exports = {
  addHistory,
  getHistorys,
  deleteHistory,
};

