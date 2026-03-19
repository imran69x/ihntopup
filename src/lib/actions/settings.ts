'use server';
/**
 * @fileOverview A server action to securely update payment settings.
 *
 * - updatePaymentSettings - A function that securely updates the payment mode.
 * - UpdatePaymentSettingsInput - The input type for the updatePaymentSettings function.
 * - UpdatePaymentSettingsOutput - The return type for the updatePaymentSettings function.
 */

import { z } from 'zod';
import { adminFirestore } from '@/lib/firebase-admin';

const UpdatePaymentSettingsInputSchema = z.object({
  mode: z.enum(['manual', 'automatic']),
});
type UpdatePaymentSettingsInput = z.infer<typeof UpdatePaymentSettingsInputSchema>;

const UpdatePaymentSettingsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type UpdatePaymentSettingsOutput = z.infer<typeof UpdatePaymentSettingsOutputSchema>;

export async function updatePaymentSettings({ mode }: UpdatePaymentSettingsInput): Promise<UpdatePaymentSettingsOutput> {
    try {
      const settingsRef = adminFirestore().collection('settings').doc('payment');
      await settingsRef.set({ mode: mode }, { merge: true });
      return { success: true, message: 'Payment settings updated successfully.' };
    } catch (error: any) {
        console.error("Error in updatePaymentSettings function:", error);
        return { success: false, message: error.message || 'An unknown error occurred while updating payment settings.' };
    }
}
