import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tecs_auction/main.dart';

Future<void> _completeRegistration(WidgetTester tester) async {
  await tester.enterText(
    find.byKey(const Key('registration_email')),
    'user@example.com',
  );
  await tester.enterText(find.byKey(const Key('registration_phone')), '5551234567');
  await tester.enterText(
    find.byKey(const Key('registration_display_name')),
    'Bidder One',
  );
  await tester.tap(find.byKey(const Key('registration_submit')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('registration validation errors are shown for invalid submit', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const AuctionApp());

    await tester.tap(find.byKey(const Key('registration_submit')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Phone is required'), findsOneWidget);
    expect(find.text('Display name is required'), findsOneWidget);
  });

  testWidgets('verification screen appears after valid registration', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const AuctionApp());
    await _completeRegistration(tester);

    expect(find.text('Verify Email'), findsOneWidget);
    expect(find.byKey(const Key('verification_status_badge')), findsOneWidget);
    expect(find.text('Status: Verified'), findsOneWidget);
  });

  testWidgets('join screen validates auction code length', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const AuctionApp());
    await _completeRegistration(tester);

    await tester.tap(find.byKey(const Key('verification_continue')));
    await tester.pumpAndSettle();

    expect(find.text('Join Auction'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('join_code')), 'ABC');
    await tester.tap(find.byKey(const Key('join_submit')));
    await tester.pump();

    expect(find.text('Enter a 6-character code'), findsOneWidget);
  });

  testWidgets('auction switcher updates active auction label', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: JoinAuctionScreen(
          joinedAuctions: [
            JoinedAuctionOption(id: 'a1', name: 'Spring Fundraiser'),
            JoinedAuctionOption(id: 'a2', name: 'Holiday Gala'),
          ],
          onJoined: _noop,
        ),
      ),
    );

    expect(find.text('Active auction: Spring Fundraiser'), findsOneWidget);

    await tester.tap(find.byKey(const Key('joined_chip_a2')));
    await tester.pump();

    expect(find.text('Active auction: Holiday Gala'), findsOneWidget);
  });

  testWidgets('auction switcher shows empty state when no joined auctions', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: JoinAuctionScreen(joinedAuctions: [], onJoined: _noop),
      ),
    );

    expect(find.byKey(const Key('joined_empty_state')), findsOneWidget);
    expect(find.text('No joined auctions yet'), findsOneWidget);
  });

  testWidgets('item list renders entries with current bid', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ItemListScreen(
          items: [
            AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 90),
            AuctionItemView(id: 'i2', name: 'Art Class', currentBid: 120),
          ],
          onSelect: _onSelected,
        ),
      ),
    );

    expect(find.byKey(const Key('item_tile_i1')), findsOneWidget);
    expect(find.text('Gift Basket'), findsOneWidget);
    expect(find.text('Current bid: \$90'), findsOneWidget);
  });

  testWidgets('item list shows empty state', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ItemListScreen(items: [], onSelect: _onSelected),
      ),
    );

    expect(find.byKey(const Key('items_empty_state')), findsOneWidget);
    expect(find.text('No items available'), findsOneWidget);
  });

  testWidgets('item detail shows current bid and bid controls', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ItemDetailScreen(
          item: AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 90),
        ),
      ),
    );

    expect(find.byKey(const Key('item_detail_current_bid')), findsOneWidget);
    expect(find.text('Current bid: \$90'), findsOneWidget);
    expect(find.byKey(const Key('item_detail_minus')), findsOneWidget);
    expect(find.byKey(const Key('item_detail_plus')), findsOneWidget);
    expect(find.byKey(const Key('item_detail_place_bid')), findsOneWidget);

    await tester.tap(find.byKey(const Key('item_detail_plus')));
    await tester.pump();

    expect(find.text('Your bid: \$92'), findsOneWidget);
  });

  testWidgets('item detail shows bid confirmation and error state', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ItemDetailScreen(
          item: AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 90),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('item_detail_minus')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('item_detail_minus')));
    await tester.pump();

    await tester.tap(find.byKey(const Key('item_detail_place_bid')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('bid_confirm_dialog')), findsOneWidget);
    await tester.tap(find.byKey(const Key('bid_confirm_submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('item_detail_error')), findsOneWidget);
    expect(find.text('Bid must be higher than current bid.'), findsOneWidget);
  });

  testWidgets('receipt view shows totals in closed phase', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ReceiptScreen(
          items: [
            ReceiptLineItem(name: 'Gift Basket', amount: 90),
            ReceiptLineItem(name: 'Art Class', amount: 120),
          ],
          subtotal: 210,
          total: 210,
        ),
      ),
    );

    expect(find.byKey(const Key('receipt_subtotal')), findsOneWidget);
    expect(find.byKey(const Key('receipt_total')), findsOneWidget);
    expect(find.text('Subtotal: \$210'), findsOneWidget);
    expect(find.text('Total Due: \$210'), findsOneWidget);
  });

  testWidgets('notifications deep-link to referenced item', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const _NotificationHarness());

    expect(find.text('Opened item: none'), findsOneWidget);
    await tester.tap(find.byKey(const Key('notification_n1')));
    await tester.pump();

    expect(find.text('Opened item: i1'), findsOneWidget);
  });

  testWidgets('payment URL handling opens external link', (
    WidgetTester tester,
  ) async {
    String? openedUrl;
    await tester.pumpWidget(
      MaterialApp(
        home: PaymentLinkScreen(
          paymentUrl: 'https://example.org/pay',
          onOpenExternal: (url) => openedUrl = url,
        ),
      ),
    );

    expect(find.textContaining('close that tab'), findsOneWidget);

    await tester.tap(find.byKey(const Key('payment_open_button')));
    await tester.pump();

    expect(openedUrl, 'https://example.org/pay');
  });

  testWidgets('admin auction list renders and create validates', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminAuctionListCreateScreen(
          auctions: [
            JoinedAuctionOption(id: 'a1', name: 'Spring Fundraiser'),
            JoinedAuctionOption(id: 'a2', name: 'Holiday Gala'),
          ],
        ),
      ),
    );

    expect(find.byKey(const Key('admin_auction_a1')), findsOneWidget);
    expect(find.byKey(const Key('admin_auction_a2')), findsOneWidget);

    await tester.tap(find.byKey(const Key('admin_create_submit')));
    await tester.pump();

    expect(find.text('Auction name is required'), findsOneWidget);
    expect(find.text('Auction code must be 6+ chars'), findsOneWidget);
  });

  testWidgets('admin auction edit screen is role-gated', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminAuctionEditScreen(
          canEdit: false,
          name: 'Spring Fundraiser',
          timeZone: 'America/New_York',
          paymentUrl: 'https://example.org/pay',
        ),
      ),
    );

    final nameField = tester.widget<TextFormField>(
      find.byKey(const Key('admin_edit_name')),
    );
    expect(nameField.enabled, false);

    final saveButton = tester.widget<FilledButton>(
      find.byKey(const Key('admin_edit_save')),
    );
    expect(saveButton.onPressed, isNull);
  });

  testWidgets('phase override screen is role-gated', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminPhaseOverrideScreen(
          canOverride: false,
          currentPhase: 'Open',
        ),
      ),
    );

    final applyButton = tester.widget<FilledButton>(
      find.byKey(const Key('phase_override_apply')),
    );
    expect(applyButton.onPressed, isNull);
  });

  testWidgets('notification settings toggle and save works', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminNotificationSettingsScreen(initialInAppEnabled: true),
      ),
    );

    final beforeToggle = tester.widget<SwitchListTile>(
      find.byKey(const Key('notifications_toggle')),
    );
    expect(beforeToggle.value, true);

    await tester.tap(find.byKey(const Key('notifications_toggle')));
    await tester.pump();

    final afterToggle = tester.widget<SwitchListTile>(
      find.byKey(const Key('notifications_toggle')),
    );
    expect(afterToggle.value, false);

    await tester.tap(find.byKey(const Key('notifications_save')));
    await tester.pump();

    expect(
      find.byKey(const Key('notifications_saved_message')),
      findsOneWidget,
    );
  });

  testWidgets('membership assignment flow assigns selected role', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminMembershipAssignmentScreen(
          adminUsers: ['admin-l2@example.com', 'admin-l3@example.com'],
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('membership_user_dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('admin-l3@example.com').last);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('membership_role_dropdown')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('AdminL2').last);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('membership_assign_button')));
    await tester.pump();

    expect(find.byKey(const Key('membership_result')), findsOneWidget);
    expect(
      find.text('Assigned AdminL2 to admin-l3@example.com'),
      findsOneWidget,
    );
  });

  testWidgets('admin item management validates create and supports edit load', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminItemManagementScreen(
          items: [
            AuctionItemView(id: 'i1', name: 'Gift Basket', currentBid: 90),
          ],
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('admin_item_save')));
    await tester.pump();
    expect(find.text('Item name is required'), findsOneWidget);
    expect(find.text('Enter a valid starting price'), findsOneWidget);

    await tester.tap(find.byKey(const Key('admin_item_i1')));
    await tester.pump();

    final nameField = tester.widget<TextFormField>(
      find.byKey(const Key('admin_item_name')),
    );
    expect(nameField.controller?.text, 'Gift Basket');
  });

  testWidgets('item image upload shows invalid image handling', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminItemImageUploadScreen(),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('image_filename_input')),
      'malware.exe',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.byKey(const Key('image_error')), findsOneWidget);
    expect(find.text('Unsupported file type'), findsOneWidget);
    expect(find.byKey(const Key('image_preview')), findsNothing);
  });

  testWidgets('admin totals table renders rows', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminTotalsScreen(
          rows: [
            BidderTotalsRow(
              bidderNumber: 7,
              displayName: 'Bidder One',
              total: 210,
              paid: false,
            ),
          ],
        ),
      ),
    );

    expect(find.text('Bidder #'), findsOneWidget);
    expect(find.text('Bidder One'), findsOneWidget);
    expect(find.text('\$210'), findsOneWidget);
    expect(find.text('No'), findsOneWidget);
  });

  testWidgets('payment and pickup update flow saves state', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AdminStatusUpdateScreen(),
      ),
    );

    await tester.tap(find.byKey(const Key('status_paid_checkbox')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('status_pickup_checkbox')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('status_save_button')));
    await tester.pump();

    expect(find.byKey(const Key('status_saved_message')), findsOneWidget);
    expect(find.text('Saved: paid=true, pickedUp=true'), findsOneWidget);
  });

  testWidgets('reports screen triggers CSV export action', (
    WidgetTester tester,
  ) async {
    var exported = false;
    await tester.pumpWidget(
      MaterialApp(
        home: AdminReportsScreen(
          bidderCount: 10,
          itemsCount: 25,
          grossTotal: 2000,
          onExportCsv: () => exported = true,
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('reports_export_csv')));
    await tester.pump();

    expect(exported, true);
  });

  testWidgets('QR and PDF action triggers fire', (WidgetTester tester) async {
    var qrTriggered = false;
    var pdfTriggered = false;
    await tester.pumpWidget(
      MaterialApp(
        home: AdminQrPdfActionsScreen(
          onGenerateQr: () => qrTriggered = true,
          onGeneratePdf: () => pdfTriggered = true,
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('admin_generate_qr')));
    await tester.tap(find.byKey(const Key('admin_generate_pdf')));
    await tester.pump();

    expect(qrTriggered, true);
    expect(pdfTriggered, true);
  });
}

void _noop() {}
void _onSelected(AuctionItemView _) {}

class _NotificationHarness extends StatefulWidget {
  const _NotificationHarness();

  @override
  State<_NotificationHarness> createState() => _NotificationHarnessState();
}

class _NotificationHarnessState extends State<_NotificationHarness> {
  String _openedItemId = 'none';

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Column(
          children: [
            Expanded(
              child: NotificationsScreen(
                notifications: const [
                  BidderNotification(
                    id: 'n1',
                    message: 'You were outbid.',
                    refItemId: 'i1',
                  ),
                ],
                onOpenItem: (itemId) {
                  setState(() => _openedItemId = itemId);
                },
                onRefresh: () {},
              ),
            ),
            Text('Opened item: $_openedItemId'),
          ],
        ),
      ),
    );
  }
}
