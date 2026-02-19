const axios = require('axios');
const TelecelToken = require('../models/TelecelToken');
const SystemConfig = require('../models/SystemConfig');

class TelecelService {
  constructor() {
    this.baseURL = 'https://play.telecel.com.gh';
    this.credentials = {
      email: process.env.TELECEL_EMAIL,
      password: process.env.TELECEL_PASSWORD ,
      phoneNumber: process.env.TELECEL_PHONE
    };
    this.subscriberMsisdn = process.env.TELECEL_SUBSCRIBER_MSISDN;
  }

  // ==================== AUTH METHODS ====================

  async getActiveToken() {
    const token = await TelecelToken.findOne({
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!token) {
      throw new Error('No active token found. Admin needs to refresh token.');
    }

    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (token.expiresAt < twoHoursFromNow) {
      console.warn('[TELECEL] Token expiring soon:', token.expiresAt);
    }

    return token.token;
  }

  async getAuthToken() {
    try {
      return await this.getActiveToken();
    } catch (error) {
      console.error('[TELECEL] Token error:', error.message);
      const anyToken = await TelecelToken.findOne().sort({ createdAt: -1 });
      if (anyToken && anyToken.token) {
        console.log('[TELECEL] WARNING: Using potentially expired token from database');
        return anyToken.token;
      }
      throw new Error('Authentication token not available. Please generate a new token via Settings.');
    }
  }

  async requestOTP() {
    try {
      console.log('[TELECEL] Requesting OTP...');
      await axios.post(
        `${this.baseURL}/enterprise-request/api/check-login`,
        {
          email: this.credentials.email,
          password: this.credentials.password,
          sms_code: '',
          phone_number: this.maskPhoneNumber(this.credentials.phoneNumber)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 30000
        }
      );

      await TelecelToken.updateMany(
        { isActive: true },
        { $set: { 'otpStatus.lastOtpSent': new Date(), 'otpStatus.waitingForOtp': true } }
      );

      console.log('[TELECEL] OTP requested successfully');
      return { success: true, message: 'OTP sent to registered phone number' };
    } catch (error) {
      console.error('[TELECEL] Error requesting OTP:', error.message);
      throw error;
    }
  }

  async loginWithOTP(otpCode) {
    try {
      console.log('[TELECEL] Logging in with OTP...');
      const response = await axios.post(
        `${this.baseURL}/enterprise-request/api/login`,
        {
          email: this.credentials.email,
          password: this.credentials.password,
          sms_code: otpCode,
          phone_number: this.maskPhoneNumber(this.credentials.phoneNumber)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.token) {
        await TelecelToken.updateMany({ isActive: true }, { $set: { isActive: false } });

        const expiresAt = this.getTokenExpiration(response.data.token);
        const newToken = new TelecelToken({
          token: response.data.token,
          email: this.credentials.email,
          phoneNumber: this.credentials.phoneNumber,
          subscriberMsisdn: response.data.subscriberMsisdn || this.subscriberMsisdn,
          isActive: true,
          expiresAt,
          otpStatus: { lastOtpUsed: otpCode, waitingForOtp: false }
        });
        await newToken.save();

        console.log('[TELECEL] Login successful, token saved');
        return { success: true, token: response.data.token, expiresAt };
      }

      throw new Error('No token received from login response');
    } catch (error) {
      console.error('[TELECEL] Login error:', error.message);
      await TelecelToken.updateMany(
        { isActive: true },
        { $set: { 'lastError.message': error.message, 'lastError.occurredAt': new Date(), 'otpStatus.waitingForOtp': false } }
      );
      throw error;
    }
  }

  async checkTokenStatus() {
    try {
      const activeToken = await TelecelToken.findOne({ isActive: true }).sort({ createdAt: -1 });

      if (!activeToken) {
        return { status: 'no_token', message: 'No token configured', needsRefresh: true };
      }

      const now = new Date();
      if (!activeToken.expiresAt || activeToken.expiresAt < now) {
        return { status: 'expired', message: 'Token has expired', expiredAt: activeToken.expiresAt, needsRefresh: true };
      }

      const hoursRemaining = Math.floor((activeToken.expiresAt - now) / (1000 * 60 * 60));
      return { status: 'active', expiresAt: activeToken.expiresAt, hoursRemaining, needsRefresh: hoursRemaining < 2 };
    } catch (error) {
      return { status: 'no_token', message: 'Could not check token status', needsRefresh: true };
    }
  }

  async saveManualToken(tokenString, userId) {
    await TelecelToken.updateMany({ isActive: true }, { $set: { isActive: false } });
    const expiresAt = this.getTokenExpiration(tokenString);
    const newToken = new TelecelToken({
      token: tokenString,
      email: this.credentials.email,
      phoneNumber: this.credentials.phoneNumber,
      subscriberMsisdn: this.subscriberMsisdn,
      isActive: true,
      expiresAt,
      lastRefreshedBy: userId
    });
    await newToken.save();
    return { success: true, expiresAt };
  }

  async getTokenHistory() {
    return TelecelToken.find().sort({ createdAt: -1 }).limit(20).select('-token');
  }

  getTokenExpiration(token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      if (decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        if (expiresAt > new Date()) {
          console.log(`[TELECEL] Token expires at ${expiresAt.toISOString()} (from JWT)`);
          return expiresAt;
        }
      }
    } catch (err) {
      console.warn('[TELECEL] Could not decode token expiration:', err.message);
    }
    const fallback = new Date(Date.now() + 12 * 60 * 60 * 1000);
    console.log(`[TELECEL] Using fallback expiration: ${fallback.toISOString()}`);
    return fallback;
  }

  maskPhoneNumber(phone) {
    if (phone.startsWith('0')) {
      return phone.substring(0, 3) + '******' + phone.substring(9);
    }
    return phone;
  }

  // ==================== DATA SHARING METHODS ====================

  async sendDataBundle(phoneNumber, capacity) {
    const validation = this.validateRequest(phoneNumber, capacity);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const authToken = await this.getAuthToken();
    const plan = await SystemConfig.get('active_sharer_plan') || 'Bundle Sharer 111GB';
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const transactionId = this.generateTransactionId();

    console.log(`[TELECEL] Sending ${capacity}GB to ${formattedPhone} (txn: ${transactionId}, plan: ${plan})`);

    const requestData = {
      beneficiaryMsisdn: formattedPhone,
      volume: capacity.toString(),
      plan,
      transactionId,
      subscriberMsisdn: this.subscriberMsisdn,
      beneficiaryName: formattedPhone
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/enterprise-request/api/data-sharer/prepaid/add-beneficiary`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Origin': this.baseURL,
            'Referer': `${this.baseURL}/enterprise-request/app/bundle-sharer/beneficiaries/`
          },
          timeout: 30000,
          validateStatus: (status) => status >= 200 && status < 500
        }
      );

      if (response.status === 200 || response.status === 201) {
        const body = response.data;
        if (body && (body.success === false || body.error || body.status === 'failed' || body.status === 'error')) {
          console.log(`[TELECEL] API returned ${response.status} but body indicates failure:`, JSON.stringify(body));
          return { success: false, transactionId, error: body.message || body.error || body.errors || 'Order failed despite 200 response', details: body, statusCode: response.status };
        }
        console.log('[TELECEL] Bundle sent successfully');
        return { success: true, transactionId, data: body, message: `Successfully sent ${capacity}GB to ${formattedPhone}`, statusCode: response.status };
      }

      if (response.status === 401) {
        await TelecelToken.updateMany({ isActive: true }, {
          $set: { isActive: false, 'lastError.message': 'Token expired - 401', 'lastError.occurredAt': new Date() }
        });
        return { success: false, error: 'Token expired. Refresh token in Settings.', requiresNewToken: true, statusCode: 401 };
      }

      console.log(`[TELECEL] API error (${response.status}):`, JSON.stringify(response.data));
      console.log(`[TELECEL] Request details - Subscriber: ${this.subscriberMsisdn}, Plan: ${plan}, Email: ${this.credentials.email}`);
      return { success: false, error: response.data?.errors || response.data?.message || `Request failed (${response.status})`, details: response.data, statusCode: response.status };
    } catch (error) {
      if (error.code === 'ECONNABORTED') return { success: false, error: 'Request timeout - Telecel API not responding', statusCode: 408 };
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return { success: false, error: 'Cannot reach Telecel API', statusCode: 503 };
      if (error.message.includes('Validation failed')) return { success: false, error: error.message, statusCode: 400 };
      if (error.message.includes('token')) return { success: false, error: error.message, requiresNewToken: true, statusCode: 401 };
      return { success: false, error: error.message || 'Failed to send data bundle', statusCode: 500 };
    }
  }

  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ERP${random}${timestamp}`;
  }

  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('233')) cleaned = '0' + cleaned.substring(3);
    else if (!cleaned.startsWith('0')) cleaned = '0' + cleaned;
    if (!/^0[2-9]\d{8}$/.test(cleaned)) throw new Error(`Invalid phone number format: ${phoneNumber}`);
    return cleaned;
  }

  validateRequest(phoneNumber, capacity) {
    const errors = [];
    try {
      this.formatPhoneNumber(phoneNumber);
    } catch (error) {
      errors.push(error.message);
    }
    const capacityNum = parseFloat(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) errors.push('Capacity must be greater than 0');
    if (capacityNum > 5500) errors.push('Capacity exceeds maximum limit of 5500GB');
    return { valid: errors.length === 0, errors };
  }

  async fetchAvailablePlans() {
    try {
      const authToken = await this.getAuthToken();
      const response = await axios.get(
        `${this.baseURL}/enterprise-request/api/data-sharer/prepaid/plans`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 30000
        }
      );
      console.log('[TELECEL] Available plans:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.log('[TELECEL] Failed to fetch plans:', error.message);
      if (error.response) {
        console.log('[TELECEL] Plans response:', JSON.stringify(error.response.data));
      }
      return null;
    }
  }

  // Fetch live subscription balance from Telecel
  async fetchLiveBalance() {
    try {
      const authToken = await this.getAuthToken();
      // Convert 233XXXXXXXXX to 0XXXXXXXXX for the URL
      let phone = this.subscriberMsisdn;
      if (phone.startsWith('233')) phone = '0' + phone.substring(3);

      const response = await axios.get(
        `${this.baseURL}/enterprise-request/api/data-sharer/prepaid/subscriptions/${phone}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.data && response.data.data.length > 0) {
        const sub = response.data.data[0];
        const balanceKB = parseInt(sub.balance) || 0;
        const balanceGB = parseFloat((balanceKB / 1048576).toFixed(2)); // KB to GB
        const totalDataGB = parseFloat(sub.data) || 0;
        const usedDataGB = parseFloat((totalDataGB - balanceGB).toFixed(2));

        return {
          success: true,
          id: sub.id,
          msisdn: sub.msisdn,
          plan: sub.plan,
          price: sub.price,
          totalDataGB,
          balanceGB,
          usedDataGB,
          usagePercent: totalDataGB > 0 ? Math.round((usedDataGB / totalDataGB) * 100) : 0,
          endDate: sub.endDate,
          planLimit: sub.planLimit,
          createdAt: sub.createdAt,
          raw: sub
        };
      }

      return { success: false, error: 'No active subscription found on Telecel' };
    } catch (error) {
      console.error('[TELECEL] Failed to fetch live balance:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getServiceStatus() {
    try {
      const tokenStatus = await this.checkTokenStatus();
      let apiReachable = false;
      try {
        await axios.get(`${this.baseURL}/enterprise-request/`, { timeout: 5000 });
        apiReachable = true;
      } catch { apiReachable = false; }

      return {
        service: 'TELECEL',
        status: tokenStatus.status === 'active' && apiReachable ? 'operational' : 'degraded',
        apiReachable,
        tokenStatus: { active: tokenStatus.status === 'active', expiresIn: tokenStatus.hoursRemaining, needsRefresh: tokenStatus.needsRefresh },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { service: 'TELECEL', status: 'error', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

module.exports = TelecelService;
