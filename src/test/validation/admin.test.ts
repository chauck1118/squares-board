import { updateSquarePaymentSchema } from '../../server/validation/admin'

describe('Admin Validation Schemas', () => {
  describe('updateSquarePaymentSchema', () => {
    it('should accept valid PENDING payment status', () => {
      const { error, value } = updateSquarePaymentSchema.validate({
        paymentStatus: 'PENDING',
      })

      expect(error).toBeUndefined()
      expect(value.paymentStatus).toBe('PENDING')
    })

    it('should accept valid PAID payment status', () => {
      const { error, value } = updateSquarePaymentSchema.validate({
        paymentStatus: 'PAID',
      })

      expect(error).toBeUndefined()
      expect(value.paymentStatus).toBe('PAID')
    })

    it('should reject invalid payment status', () => {
      const { error } = updateSquarePaymentSchema.validate({
        paymentStatus: 'INVALID_STATUS',
      })

      expect(error).toBeDefined()
      expect(error?.details[0]?.message).toContain('Payment status must be either PENDING or PAID')
    })

    it('should reject missing payment status', () => {
      const { error } = updateSquarePaymentSchema.validate({})

      expect(error).toBeDefined()
      expect(error?.details[0]?.message).toContain('Payment status is required')
    })

    it('should reject null payment status', () => {
      const { error } = updateSquarePaymentSchema.validate({
        paymentStatus: null,
      })

      expect(error).toBeDefined()
      expect(error?.details[0]?.message).toContain('Payment status must be either PENDING or PAID')
    })

    it('should reject empty string payment status', () => {
      const { error } = updateSquarePaymentSchema.validate({
        paymentStatus: '',
      })

      expect(error).toBeDefined()
      expect(error?.details[0]?.message).toContain('Payment status must be either PENDING or PAID')
    })
  })
})