TIPO	Agri360 Order	Agri360 Mirroring	Agri360 Paths	Configurable Parameter
Basic Check	1	Receives crop, farmer, type of tobacco, contract ID, crop region, segment and dates and credit that started the analysis (trigger) Dates and Trigger (event generated)	Growing > Farmer > Master Data (crop, farmer, type of tobacco, contract ID, crop region, segment)	No
Basic Check	2	It verifies if the farmer has flag for Deviation or Exception (Risk Level), Deceased	Growing > Farmer > Master Data	Yes
Log	3	Opens the audit log of the execution before making any decisions.	To be Developed	No
Log	4	Clears variables, balances, limits, and indicators maintained by the previous analysis.	To be Developed	No
Basic Check	5	It seeks the current period of crop season.	Growing > Farmer > Master Data	No
Basic Check	6	It seeks the productive structure of the farmer and the crop.	Growing > Farmer > Master Data	No
Basic Check	7	It seeks the estimate of the purchase of the crop.	Growing > Farmer > Master Data	No
Basic Check	8	Fetches the estimated revenue based on the purchase estimate.	C_CALC_ENDVTO output P_VAL_RECEITA_CADEIA; related inputs P_NUM_ANO_SAFRA_COMPRA, P_NUM_ANO_SAFRA, P_COD_PRODOR, P_COD_TIPO_FUMO, P_NUM_LAVRA, P_NUM_DV_LAVRA, P_IND_ESTIM.	No
Basic Check	9	It seeks the current debt of the crop.	Finance > Farmer > Master Data	No
Basic Check	10	It seeks the current debts of the entire cluster of linked farmers.	Finance > Farmer > Master Data	No
Get Information	11	It adds up the current unpaid debt of the cluster.	Calculation	No
Get Information	12	It divides the current debt by the estimated revenue to calculate the indebtedness.	Finance > Master Data	Yes
Log	13	Records in the audit the percentage of indebtedness calculated.	To be Developed	No
Basic Check	14	Looks for the payment plan informed by the Field Technician. (payment policy 7 bound)	Growing > Farmer > Master Data	No
Basic Check	15	It seeks the comercialization policy applicable to credit. (payment policy)	Growing > Farmer > Master Data	No
Basic Check	16	Check if the farmer has flag for "Filler" or "Commercial Dispute". If so, disregard the payment policy requested by the FT; proceed to amortize debts and apply withholdings (in the event of blocks), and make a free payment only if there is a remaining balance; otherwise, proceed as follows.	Buying > Farmer > Master Data	Yes
Basic Check	17	Fetches the requested percentage from the policy.	Growing > Farmer > Master Data	No
Get Information	18	Calculates the free payment limit for the crop.	Finance > Payment Policy Parameters	No
Policy	19	Limits free payment according to policy, available revenue, and current parameters.	Finance > Payment Policy Parameters	No
Policy	20	Check the percentage already delivered of the estimate.	Finance > Payment Policy Parameters	No
Policy	21	Compares the percentage delivered with the free payment block trigger.	Finance > Payment Policy Parameters	No
Basic Check	22	It searches for crops linked to the farmer or the Cluster.	To be Discovered - Growing > Cluster > Master Data	Yes
Get Information	23	It sets up the cluster of farmers and crops that can share balances and debts.	Growing > Farmer > Cluster > Linkeage	No
Basic Check	24	It verifies whether the Cluster has anticipation securities or future debt.	To be Discovered - Growing > Cluster > Master Data	Yes
Basic Check	25	Searches for the type of document used for future debt.	Finance > Self Funding > Self Funding Parameters	No
Basic Check	26	It looks for the type of pending debt used for future debt.	Finance > Self Funding > Self Funding Parameters	No
Get Information	27	It verifies whether there has been a return of the document required to release or collect the future debt.	Finance > AgriSign - Based on the request for Growing	No
Retention	28	Sets the maximum lock amount for future debt.	Growing > Farmer > Self Funding/Block	No
Retention	29	Resets previous holds when the analysis needs to recalculate the lock. (for example, when a block is modified to reduce the amount, the analysis requires reprogramming the block and paying the difference)	Finance > Self Funding > Self Funding Parameters	No
Retention	30	Adds up the amount already retained in previous credits.	Calculation	No
Retention	31	Subtracts from the withholding limit the amount already withheld.	Calculation	No
Get Information	32	Lists the outstanding credits of the crop that triggered the analysis.	To be Developed (linkage Cluster + Debt Priorization recovery) - LM - 527	No
Get Information	33	Lists the remaining outstanding credits in the attachment cluster.	To be Developed (linkage Cluster + Debt Priorization recovery) - LM - 527	No
Get Information	34	It orders the credits by the priority of the caller, farmer, tobacco and crop credit.	To be Developed (linkage Cluster + Debt Priorization recovery) - LM - 527	No
Get Information	35	Cycles through each outstanding credit in the order you set.	To be Developed (linkage Cluster + Debt Priorization recovery) - LM - 527	No
Amortization	36	It looks for the original amount, the amount already used and the available balance of each credit.	Receivables Title Table and Posting Titles Table	No
Amortization	37	Subtracts from the credit the amounts already appropriated, blocked or retained.	Receivable Title Table and Posting Table	No
Amortization	38	If the credit has no available balance, it skips to the next credit.	To be Developed (linkage Cluster + Debt Priorization recovery) - LM - 527	No
Basic Check	39	Checks whether the credit should remain held in the account.	To be Developed	Yes
Basic Check	40	Checks if the credit is manual and has a specific block.	Finance> Credit Management >Other Credits	No
Basic Check	41	Searches and validates the bank account of the farmer	Growing > Farmer > Master Data	No
Basic Check	42	Searches for outstanding payments to suppliers originated by the credit.	Finance > Payment Generation	No
Amortization	43	It pays suppliers respecting the available credit balance.	Finance> Payment Generation	No
Basic Check	44	Seeks the balance of FUNRURAL applicable to the credit.	Buying > Farmer > Master Data - Only for Buying credit trigger	Yes
Basic Check	45	Check if the launch of FUNRURAL already exists.	Buying > Farmer > Master Data - Only for Buying credit trigger	Yes
Get Information	46	Creates the title of FUNRURAL when necessary.	Receivable Title Table and Posting Table - Only for Buying credit trigger	Yes
Amortization	47	Settles the bond and zeroes out the balance after payment.	Payables Title Table and Posting Table	No
Basic Check	48	It seeks the farmer's debt balance before amortizing.	Finance > Farmer > Receivables Titles Table	No
Amortization	49	It limits debt repayment to the lowest amount between debt and credit available.	Limit by comparison: AUX_VAL_RETER := WRK_VAL_RETENC_BLOQIO - AUX_VAL_RETENC_ANALISE; IF AUX_VAL_RETER > AUX_VAL_CRED_PENDEN THEN AUX_VAL_RETER := AUX_VAL_CRED_PENDEN; — source: 'Debug da Analise'!B14632:B14634. The payment routine applies the same lower-value logic to debt.	No
Amortization	50	Subtracts from the credit the amount used to pay debt.	Receivable Title Table and Posting Table	No
Amortization	51	Updates the remaining debt balance.	Pending Balance Table	No
Amortization	52	It checks if there is a retained balance that can be released after the payment of debts.	Posting Table	No
Payment	53	It freely pays the farmer the balance released after debt and withholdings.	Finance > Payment Generation	No
Amortization	54	When the rule requires it, it pays the credit directly from the balance.	Finance > Credit Mangement > Other Credits	No
Amortization	55	When there is a linked cluster, it tries to pay for the balance within the cluster.	To be Developed (Linkage Cluster + Payment Generation)	No
Retention	56	Calculates the amount eligible for future debt retention.	Finance > Self Funding > Self Funding Parameters	No
Retention	57	Limits retention to the smallest amount between limit, available credit, and future debt.	Finance > Self Funding > Self Funding Parameters	No
Retention	58	Records the amount retained for future debt in the analyzed credit.	Self Funding Table	No
Retention	59	Adds the amount withheld to the total already withheld in the execution.	Calculation	No
Retention	60	If the blockage decreases, it identifies excess retention that should be released. (for example, when a block is modified to reduce the amount, the analysis requires reprogramming the block and paying the difference)	Finance > Self Funding > Self Funding Parameters	No
Retention	61	Appropriates the amount withheld from the debts when the collection conditions are met.	Self Funding Table	No
Basic Check	62	Checks if the credit was fully appropriated.	Finance > Farmer > Pending Credits - Receivables - Payables = Pending Balance	No
Get Information	63	Updates the credit utilization indicator.	To be Developed (Credit used?)	Yes
Get Information	64	Updates the notification and farmer information only on the main credit.	Pending Credit Table	No
Retention	65	Records the company's revenue when there is an amount allocated to the company.	To be Developed (Contractual Fine)	No
Payment	66	It generates payment to the farmer when there is free value available.	Finance > Payment Generation	No
Payment	67	Generates the payment for the balance when the rule determines this output.	Finance > Payment Generation	No
Payment	68	Updates the base date and the date of the payment order.	Finance > Payment Generation	No
Log	69	Records every decision and every amount affected in the audit.	To be Developed	No
Get Information	70	Adds up the amounts paid, retained, blocked and appropriated from all credits.	Calculation	No
Get Information	71	Check if there are any outstanding credits remaining in the cluster.	Pending Credit Table	No
Get Information	72	Checks if the minimum free payout amount has been reached.	Finance > Payment Generation (Minimum amount to pay setting, If the minimum is not reached, it keeps the retained amount for later analysis. The engine applies decision-making + value analysis/allocation and passes the result to the next applicable rule.)	No
Get Information	73	If the minimum is not reached, it keeps the retained amount for later analysis.	Finance > Payment Generation (Minimum amount to pay setting, If the minimum is not reached, it keeps the retained amount for later analysis. The engine applies decision-making + value analysis/allocation and passes the result to the next applicable rule.)	No
Payment	74	If the minimum is reached, it releases the accrued free payout.	Finance > Payment Generation	No
Indebtness	75	It recalculates the debt after payments and appropriations.	Endividamento final = remaining debt ÷ receita × 100: (...) / AUX_VAL_RECEITA_CADEIA * 100; — sources: 'Debug da Analise'!B16011 e B16436.	No
Retention	76	Updates the ending debt, credit, and retention balances.	Self Funding Table	No
Get Information	77	Checks whether refunds or chargebacks have created new credit.	Pending Credit Table	No
Get Information	78	If there is new credit, it calls the analysis again to process it.	To be Developed	No
Log	79	When all steps finish without error, commits the changes.	To be Developed	No
Log	80	Ends the audit with the results and balances of the execution.	To be Developed	No
