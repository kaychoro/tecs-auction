import 'package:flutter/material.dart';

void main() {
  runApp(const AuctionApp());
}

enum BidderStage { registration, verification, join, itemList }

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

class AuctionApp extends StatefulWidget {
  const AuctionApp({super.key});

  @override
  State<AuctionApp> createState() => _AuctionAppState();
}

class _AuctionAppState extends State<AuctionApp> {
  BidderStage _stage = BidderStage.registration;

  void _goToVerification() {
    setState(() => _stage = BidderStage.verification);
  }

  void _goToJoin() {
    setState(() => _stage = BidderStage.join);
  }

  void _goToItemList() {
    setState(() => _stage = BidderStage.itemList);
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
        screen = const ItemListScreen(
          items: [
            AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 85),
            AuctionItemView(id: 'i2', name: 'Principal for a Day', currentBid: 140),
          ],
        );
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
  });

  final List<AuctionItemView> items;

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
                );
              },
            ),
    );
  }
}
