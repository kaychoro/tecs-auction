import 'package:flutter/material.dart';

void main() {
  runApp(const AuctionApp());
}

enum BidderStage { registration, verification, join, itemList, itemDetail }

class JoinedAuctionOption {
  const JoinedAuctionOption({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;
}

class AuctionItemView {
  const AuctionItemView({
    required this.id,
    required this.name,
    required this.currentBid,
  });

  final String id;
  final String name;
  final int currentBid;
}

class ReceiptLineItem {
  const ReceiptLineItem({
    required this.name,
    required this.amount,
  });

  final String name;
  final int amount;
}

class BidderNotification {
  const BidderNotification({
    required this.id,
    required this.message,
    required this.refItemId,
  });

  final String id;
  final String message;
  final String refItemId;
}

class AuctionApp extends StatefulWidget {
  const AuctionApp({super.key});

  @override
  State<AuctionApp> createState() => _AuctionAppState();
}

class _AuctionAppState extends State<AuctionApp> {
  BidderStage _stage = BidderStage.registration;
  AuctionItemView? _selectedItem;

  void _goToVerification() {
    setState(() => _stage = BidderStage.verification);
  }

  void _goToJoin() {
    setState(() => _stage = BidderStage.join);
  }

  void _goToItemList() {
    setState(() => _stage = BidderStage.itemList);
  }

  void _goToItemDetail(AuctionItemView item) {
    setState(() {
      _selectedItem = item;
      _stage = BidderStage.itemDetail;
    });
  }

  @override
  Widget build(BuildContext context) {
    Widget screen;
    switch (_stage) {
      case BidderStage.registration:
        screen = RegistrationScreen(onContinue: _goToVerification);
      case BidderStage.verification:
        screen = VerificationScreen(onContinue: _goToJoin);
      case BidderStage.join:
        screen = JoinAuctionScreen(
          joinedAuctions: [
            JoinedAuctionOption(id: 'a1', name: 'Spring Fundraiser'),
            JoinedAuctionOption(id: 'a2', name: 'Holiday Gala'),
          ],
          onJoined: _goToItemList,
        );
      case BidderStage.itemList:
        screen = ItemListScreen(
          items: [
            AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 85),
            AuctionItemView(id: 'i2', name: 'Principal for a Day', currentBid: 140),
          ],
          onSelect: _goToItemDetail,
        );
      case BidderStage.itemDetail:
        screen = ItemDetailScreen(item: _selectedItem!);
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TECS Auction',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1C6E6A),
          brightness: Brightness.light,
        ),
      ),
      home: screen,
    );
  }
}

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _displayNameController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Email is required';
    }
    if (!text.contains('@')) {
      return 'Enter a valid email';
    }
    return null;
  }

  String? _validatePhone(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Phone is required';
    }
    final digits = text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 10) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  String? _validateDisplayName(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return 'Display name is required';
    }
    if (text.length < 2) {
      return 'Display name is too short';
    }
    return null;
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    widget.onContinue();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bidder Registration')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: ListView(
                children: [
                  Text(
                    'Create your auction profile',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    key: const Key('registration_email'),
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: _validateEmail,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('registration_phone'),
                    controller: _phoneController,
                    decoration: const InputDecoration(labelText: 'Phone'),
                    validator: _validatePhone,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('registration_display_name'),
                    controller: _displayNameController,
                    decoration: const InputDecoration(labelText: 'Display name'),
                    validator: _validateDisplayName,
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    key: const Key('registration_submit'),
                    onPressed: _submit,
                    child: const Text('Continue'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class VerificationScreen extends StatelessWidget {
  const VerificationScreen({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Email')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Verification Required',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Please verify your email address before joining an auction.',
                ),
                const SizedBox(height: 20),
                Container(
                  key: const Key('verification_status_badge'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2F1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('Status: Verified'),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  key: const Key('verification_continue'),
                  onPressed: onContinue,
                  child: const Text('Join Auction'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class JoinAuctionScreen extends StatefulWidget {
  const JoinAuctionScreen({
    super.key,
    required this.joinedAuctions,
    required this.onJoined,
  });

  final List<JoinedAuctionOption> joinedAuctions;
  final VoidCallback onJoined;

  @override
  State<JoinAuctionScreen> createState() => _JoinAuctionScreenState();
}

class _JoinAuctionScreenState extends State<JoinAuctionScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _codeController = TextEditingController();
  String? _selectedAuctionId;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    if (widget.joinedAuctions.isNotEmpty) {
      _selectedAuctionId = widget.joinedAuctions.first.id;
    }
  }

  String? _validateCode(String? value) {
    final text = (value ?? '').trim().toUpperCase();
    if (text.isEmpty) {
      return 'Auction code is required';
    }
    if (text.length < 6) {
      return 'Enter a 6-character code';
    }
    return null;
  }

  void _submitJoin() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    widget.onJoined();
  }

  @override
  Widget build(BuildContext context) {
    JoinedAuctionOption? selectedAuction;
    for (final auction in widget.joinedAuctions) {
      if (auction.id == _selectedAuctionId) {
        selectedAuction = auction;
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Join Auction')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Joined auctions',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  if (widget.joinedAuctions.isEmpty)
                    const Text(
                      'No joined auctions yet',
                      key: Key('joined_empty_state'),
                    )
                  else ...[
                    Wrap(
                      spacing: 8,
                      children: widget.joinedAuctions.map((auction) {
                        final isSelected = auction.id == _selectedAuctionId;
                        return ChoiceChip(
                          key: Key('joined_chip_${auction.id}'),
                          label: Text(auction.name),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() => _selectedAuctionId = auction.id);
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Active auction: ${selectedAuction?.name ?? '-'}',
                      key: const Key('joined_selected_label'),
                    ),
                  ],
                  const SizedBox(height: 20),
                  TextFormField(
                    key: const Key('join_code'),
                    controller: _codeController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(labelText: 'Auction code'),
                    validator: _validateCode,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    key: const Key('join_submit'),
                    onPressed: _submitJoin,
                    child: const Text('Join'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ItemListScreen extends StatelessWidget {
  const ItemListScreen({
    super.key,
    required this.items,
    required this.onSelect,
  });

  final List<AuctionItemView> items;
  final ValueChanged<AuctionItemView> onSelect;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Auction Items')),
      body: items.isEmpty
          ? const Center(
              child: Text(
                'No items available',
                key: Key('items_empty_state'),
              ),
            )
          : ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, _) => const Divider(height: 0),
              itemBuilder: (context, index) {
                final item = items[index];
                return ListTile(
                  key: Key('item_tile_${item.id}'),
                  title: Text(item.name),
                  subtitle: Text('Current bid: \$${item.currentBid}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => onSelect(item),
                );
              },
            ),
    );
  }
}

class ItemDetailScreen extends StatefulWidget {
  const ItemDetailScreen({
    super.key,
    required this.item,
  });

  final AuctionItemView item;

  @override
  State<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class ReceiptScreen extends StatelessWidget {
  const ReceiptScreen({
    super.key,
    required this.items,
    required this.subtotal,
    required this.total,
  });

  final List<ReceiptLineItem> items;
  final int subtotal;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Receipt')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Auction Closed',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return ListTile(
                    key: Key('receipt_item_$index'),
                    title: Text(item.name),
                    trailing: Text('\$${item.amount}'),
                  );
                },
              ),
            ),
            Text('Subtotal: \$$subtotal', key: const Key('receipt_subtotal')),
            const SizedBox(height: 6),
            Text(
              'Total Due: \$$total',
              key: const Key('receipt_total'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ],
        ),
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({
    super.key,
    required this.notifications,
    required this.onOpenItem,
    required this.onRefresh,
  });

  final List<BidderNotification> notifications;
  final ValueChanged<String> onOpenItem;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            key: const Key('notifications_refresh'),
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: notifications.length,
        itemBuilder: (context, index) {
          final notification = notifications[index];
          return ListTile(
            key: Key('notification_${notification.id}'),
            title: Text(notification.message),
            subtitle: Text('Item: ${notification.refItemId}'),
            onTap: () => onOpenItem(notification.refItemId),
          );
        },
      ),
    );
  }
}

class PaymentLinkScreen extends StatelessWidget {
  const PaymentLinkScreen({
    super.key,
    required this.paymentUrl,
    required this.onOpenExternal,
  });

  final String paymentUrl;
  final ValueChanged<String> onOpenExternal;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Open payment in a new tab to complete checkout.',
                ),
                const SizedBox(height: 12),
                const Text('After paying, close that tab to return here.'),
                const SizedBox(height: 18),
                FilledButton(
                  key: const Key('payment_open_button'),
                  onPressed: () => onOpenExternal(paymentUrl),
                  child: const Text('Open Payment Page'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AdminAuctionListCreateScreen extends StatefulWidget {
  const AdminAuctionListCreateScreen({
    super.key,
    required this.auctions,
  });

  final List<JoinedAuctionOption> auctions;

  @override
  State<AdminAuctionListCreateScreen> createState() =>
      _AdminAuctionListCreateScreenState();
}

class AdminAuctionEditScreen extends StatelessWidget {
  const AdminAuctionEditScreen({
    super.key,
    required this.canEdit,
    required this.name,
    required this.timeZone,
    required this.paymentUrl,
  });

  final bool canEdit;
  final String name;
  final String timeZone;
  final String paymentUrl;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Auction')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextFormField(
              key: const Key('admin_edit_name'),
              initialValue: name,
              enabled: canEdit,
              decoration: const InputDecoration(labelText: 'Auction name'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              key: const Key('admin_edit_timezone'),
              initialValue: timeZone,
              enabled: canEdit,
              decoration: const InputDecoration(labelText: 'Time zone'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              key: const Key('admin_edit_payment_url'),
              initialValue: paymentUrl,
              enabled: canEdit,
              decoration: const InputDecoration(labelText: 'Payment URL'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('admin_edit_save'),
              onPressed: canEdit ? () {} : null,
              child: const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }
}

class AdminPhaseOverrideScreen extends StatefulWidget {
  const AdminPhaseOverrideScreen({
    super.key,
    required this.canOverride,
    required this.currentPhase,
  });

  final bool canOverride;
  final String currentPhase;

  @override
  State<AdminPhaseOverrideScreen> createState() =>
      _AdminPhaseOverrideScreenState();
}

class AdminNotificationSettingsScreen extends StatefulWidget {
  const AdminNotificationSettingsScreen({
    super.key,
    required this.initialInAppEnabled,
  });

  final bool initialInAppEnabled;

  @override
  State<AdminNotificationSettingsScreen> createState() =>
      _AdminNotificationSettingsScreenState();
}

class AdminMembershipAssignmentScreen extends StatefulWidget {
  const AdminMembershipAssignmentScreen({
    super.key,
    required this.adminUsers,
  });

  final List<String> adminUsers;

  @override
  State<AdminMembershipAssignmentScreen> createState() =>
      _AdminMembershipAssignmentScreenState();
}

class AdminItemManagementScreen extends StatefulWidget {
  const AdminItemManagementScreen({
    super.key,
    required this.items,
  });

  final List<AuctionItemView> items;

  @override
  State<AdminItemManagementScreen> createState() =>
      _AdminItemManagementScreenState();
}

class AdminItemImageUploadScreen extends StatefulWidget {
  const AdminItemImageUploadScreen({super.key});

  @override
  State<AdminItemImageUploadScreen> createState() =>
      _AdminItemImageUploadScreenState();
}

class BidderTotalsRow {
  const BidderTotalsRow({
    required this.bidderNumber,
    required this.displayName,
    required this.total,
    required this.paid,
  });

  final int bidderNumber;
  final String displayName;
  final int total;
  final bool paid;
}

class AdminTotalsScreen extends StatelessWidget {
  const AdminTotalsScreen({
    super.key,
    required this.rows,
  });

  final List<BidderTotalsRow> rows;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bidder Totals')),
      body: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Bidder #')),
            DataColumn(label: Text('Name')),
            DataColumn(label: Text('Total')),
            DataColumn(label: Text('Paid')),
          ],
          rows: rows
              .map(
                (row) => DataRow(
                  cells: [
                    DataCell(Text('${row.bidderNumber}')),
                    DataCell(Text(row.displayName)),
                    DataCell(Text('\$${row.total}')),
                    DataCell(Text(row.paid ? 'Yes' : 'No')),
                  ],
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _AdminItemImageUploadScreenState extends State<AdminItemImageUploadScreen> {
  String? _selectedFile;
  String? _error;

  void _handleFileName(String fileName) {
    final lower = fileName.toLowerCase();
    final isValid = lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg');
    setState(() {
      if (!isValid) {
        _selectedFile = null;
        _error = 'Unsupported file type';
      } else {
        _selectedFile = fileName;
        _error = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Item Image Upload')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              key: const Key('image_filename_input'),
              decoration: const InputDecoration(
                labelText: 'Image file name',
                hintText: 'example.jpg',
              ),
              onSubmitted: _handleFileName,
            ),
            const SizedBox(height: 12),
            if (_error != null)
              Text(
                _error!,
                key: const Key('image_error'),
                style: const TextStyle(color: Colors.red),
              ),
            if (_selectedFile != null)
              Container(
                key: const Key('image_preview'),
                width: 220,
                height: 130,
                color: const Color(0xFFE8F5E9),
                alignment: Alignment.center,
                child: Text('Preview: $_selectedFile'),
              ),
          ],
        ),
      ),
    );
  }
}

class _AdminItemManagementScreenState extends State<AdminItemManagementScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  String? _editingItemId;

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  void _loadForEdit(AuctionItemView item) {
    setState(() {
      _editingItemId = item.id;
      _nameController.text = item.name;
      _priceController.text = item.currentBid.toString();
    });
  }

  void _save() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _editingItemId == null ? 'Item created' : 'Item updated',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Item Management')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                itemCount: widget.items.length,
                itemBuilder: (context, index) {
                  final item = widget.items[index];
                  return ListTile(
                    key: Key('admin_item_${item.id}'),
                    title: Text(item.name),
                    subtitle: Text('Starting price: \$${item.currentBid}'),
                    onTap: () => _loadForEdit(item),
                  );
                },
              ),
            ),
            const Divider(),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    key: const Key('admin_item_name'),
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Item name'),
                    validator: (value) {
                      final text = value?.trim() ?? '';
                      if (text.isEmpty) {
                        return 'Item name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    key: const Key('admin_item_price'),
                    controller: _priceController,
                    decoration: const InputDecoration(labelText: 'Starting price'),
                    validator: (value) {
                      final parsed = int.tryParse((value ?? '').trim());
                      if (parsed == null || parsed < 1) {
                        return 'Enter a valid starting price';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    key: const Key('admin_item_save'),
                    onPressed: _save,
                    child: Text(_editingItemId == null ? 'Create' : 'Update'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminMembershipAssignmentScreenState
    extends State<AdminMembershipAssignmentScreen> {
  String? _selectedUser;
  String _selectedRole = 'AdminL3';
  String? _lastAssignment;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Membership Assignment')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              key: const Key('membership_user_dropdown'),
              initialValue: _selectedUser,
              decoration: const InputDecoration(labelText: 'Admin user'),
              items: widget.adminUsers
                  .map((user) => DropdownMenuItem(value: user, child: Text(user)))
                  .toList(),
              onChanged: (value) => setState(() => _selectedUser = value),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: const Key('membership_role_dropdown'),
              initialValue: _selectedRole,
              decoration: const InputDecoration(labelText: 'Role override'),
              items: const [
                DropdownMenuItem(value: 'AdminL3', child: Text('AdminL3')),
                DropdownMenuItem(value: 'AdminL2', child: Text('AdminL2')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedRole = value);
                }
              },
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('membership_assign_button'),
              onPressed: _selectedUser == null
                  ? null
                  : () {
                      setState(() {
                        _lastAssignment = 'Assigned $_selectedRole to $_selectedUser';
                      });
                    },
              child: const Text('Assign'),
            ),
            const SizedBox(height: 12),
            if (_lastAssignment != null)
              Text(_lastAssignment!, key: const Key('membership_result')),
          ],
        ),
      ),
    );
  }
}

class _AdminNotificationSettingsScreenState
    extends State<AdminNotificationSettingsScreen> {
  late bool _inAppEnabled;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _inAppEnabled = widget.initialInAppEnabled;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notification Settings')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            SwitchListTile(
              key: const Key('notifications_toggle'),
              title: const Text('Enable in-app outbid notifications'),
              value: _inAppEnabled,
              onChanged: (value) {
                setState(() {
                  _saved = false;
                  _inAppEnabled = value;
                });
              },
            ),
            const SizedBox(height: 8),
            FilledButton(
              key: const Key('notifications_save'),
              onPressed: () {
                setState(() => _saved = true);
              },
              child: const Text('Save'),
            ),
            const SizedBox(height: 12),
            if (_saved)
              const Text(
                'Settings saved',
                key: Key('notifications_saved_message'),
              ),
          ],
        ),
      ),
    );
  }
}

class _AdminPhaseOverrideScreenState extends State<AdminPhaseOverrideScreen> {
  late String _phase;
  static const List<String> _phases = [
    'Setup',
    'Ready',
    'Open',
    'Pending',
    'Complete',
    'Closed',
  ];

  @override
  void initState() {
    super.initState();
    _phase = widget.currentPhase;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Phase Override')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              key: const Key('phase_override_dropdown'),
              initialValue: _phase,
              decoration: const InputDecoration(labelText: 'Auction phase'),
              items: _phases
                  .map((phase) => DropdownMenuItem(
                        value: phase,
                        child: Text(phase),
                      ))
                  .toList(),
              onChanged: widget.canOverride
                  ? (value) {
                      if (value != null) {
                        setState(() => _phase = value);
                      }
                    }
                  : null,
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('phase_override_apply'),
              onPressed: widget.canOverride ? () {} : null,
              child: const Text('Apply Override'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminAuctionListCreateScreenState
    extends State<AdminAuctionListCreateScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _createAuction() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Auction created')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Auctions')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Auctions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: widget.auctions.length,
                itemBuilder: (context, index) {
                  final auction = widget.auctions[index];
                  return ListTile(
                    key: Key('admin_auction_${auction.id}'),
                    title: Text(auction.name),
                    subtitle: Text('ID: ${auction.id}'),
                  );
                },
              ),
            ),
            const Divider(),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    key: const Key('admin_create_name'),
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Auction name'),
                    validator: (value) {
                      final text = value?.trim() ?? '';
                      if (text.isEmpty) {
                        return 'Auction name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    key: const Key('admin_create_code'),
                    controller: _codeController,
                    decoration: const InputDecoration(labelText: 'Auction code'),
                    validator: (value) {
                      final text = value?.trim() ?? '';
                      if (text.length < 6) {
                        return 'Auction code must be 6+ chars';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      key: const Key('admin_create_submit'),
                      onPressed: _createAuction,
                      child: const Text('Create Auction'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ItemDetailScreenState extends State<ItemDetailScreen> {
  late int _bidAmount;
  String? _bidErrorCode;

  @override
  void initState() {
    super.initState();
    _bidAmount = widget.item.currentBid + 1;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.item.name)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current bid: \$${widget.item.currentBid}',
              key: const Key('item_detail_current_bid'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(
              'Your bid: \$$_bidAmount',
              key: const Key('item_detail_bid_amount'),
            ),
            const SizedBox(height: 12),
            if (_bidErrorCode != null)
              Container(
                key: const Key('item_detail_error'),
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE9E7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_messageForError(_bidErrorCode!)),
              ),
            Row(
              children: [
                OutlinedButton(
                  key: const Key('item_detail_minus'),
                  onPressed: () {
                    setState(() {
                      _bidAmount = _bidAmount > 1 ? _bidAmount - 1 : 1;
                    });
                  },
                  child: const Text('-\$1'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  key: const Key('item_detail_plus'),
                  onPressed: () {
                    setState(() => _bidAmount += 1);
                  },
                  child: const Text('+\$1'),
                ),
              ],
            ),
            const SizedBox(height: 14),
            FilledButton(
              key: const Key('item_detail_place_bid'),
              onPressed: _confirmAndSubmitBid,
              child: const Text('Place Bid'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmAndSubmitBid() async {
    final shouldSubmit = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          key: const Key('bid_confirm_dialog'),
          title: const Text('Confirm Bid'),
          content: Text('Submit bid for \$$_bidAmount?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              key: const Key('bid_confirm_submit'),
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (shouldSubmit != true) {
      return;
    }

    setState(() {
      if (_bidAmount <= widget.item.currentBid) {
        _bidErrorCode = 'bid_too_low';
      } else {
        _bidErrorCode = null;
      }
    });
  }

  String _messageForError(String code) {
    switch (code) {
      case 'bid_too_low':
        return 'Bid must be higher than current bid.';
      case 'phase_closed':
        return 'Bidding is closed for this item.';
      case 'outbid':
        return 'Another bidder placed a higher bid.';
      default:
        return 'Unable to place bid.';
    }
  }
}
