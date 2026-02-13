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
        home: ItemListScreen(items: []),
      ),
    );

    expect(find.byKey(const Key('items_empty_state')), findsOneWidget);
    expect(find.text('No items available'), findsOneWidget);
  });
}

void _noop() {}
